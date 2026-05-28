use crate::privacy::PrivacyFilter;
use parking_lot::Mutex;
use rdev::{EventType, Key};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread::{self, JoinHandle};
use std::time::{Duration, Instant};
use typr_db::{queries, Database, KeyEvent};

const FLUSH_INTERVAL: Duration = Duration::from_secs(3);
const BATCH_SIZE: usize = 500;

#[derive(Debug, Clone, Default)]
pub struct CaptureState {
    pub running: bool,
    pub paused: bool,
    pub events_buffered: usize,
    pub session_id: Option<String>,
}

pub struct CaptureConfig {
    pub db_path: std::path::PathBuf,
    pub session_id: String,
}

pub struct CaptureHandle {
    stop: Arc<AtomicBool>,
    listen_thread: Option<JoinHandle<()>>,
    flush_thread: Option<JoinHandle<()>>,
    buffer: Arc<Mutex<Vec<KeyEvent>>>,
    state: Arc<Mutex<CaptureState>>,
    privacy: Arc<Mutex<PrivacyFilter>>,
    db_path: std::path::PathBuf,
    session_id: String,
}

impl CaptureHandle {
    pub fn start(config: CaptureConfig, blocklist: Vec<String>) -> Result<Self, String> {
        let db = Database::open(&config.db_path).map_err(|e| e.to_string())?;
        queries::create_session(db.conn(), &config.session_id, "passive")
            .map_err(|e| e.to_string())?;

        let stop = Arc::new(AtomicBool::new(false));
        let buffer = Arc::new(Mutex::new(Vec::with_capacity(BATCH_SIZE)));
        let state = Arc::new(Mutex::new(CaptureState {
            running: true,
            paused: false,
            events_buffered: 0,
            session_id: Some(config.session_id.clone()),
        }));
        let privacy = Arc::new(Mutex::new(PrivacyFilter::new(blocklist)));

        let stop_listen = stop.clone();
        let buffer_listen = buffer.clone();
        let state_listen = state.clone();
        let privacy_listen = privacy.clone();
        let session_id_listen = config.session_id.clone();
        let db_path_listen = config.db_path.clone();

        let listen_thread = thread::spawn(move || {
            let _ = run_listen(
                stop_listen,
                buffer_listen,
                state_listen,
                privacy_listen,
                session_id_listen,
                db_path_listen,
            );
        });

        let stop_flush = stop.clone();
        let buffer_flush = buffer.clone();
        let state_flush = state.clone();
        let db_path_flush = config.db_path.clone();

        let flush_thread = thread::spawn(move || {
            while !stop_flush.load(Ordering::SeqCst) {
                thread::sleep(FLUSH_INTERVAL);
                flush_buffer(&db_path_flush, &buffer_flush, &state_flush);
            }
            flush_buffer(&db_path_flush, &buffer_flush, &state_flush);
        });

        Ok(Self {
            stop,
            listen_thread: Some(listen_thread),
            flush_thread: Some(flush_thread),
            buffer,
            state,
            privacy,
            db_path: config.db_path,
            session_id: config.session_id,
        })
    }

    pub fn stop(&mut self) {
        self.stop.store(true, Ordering::SeqCst);
        if let Some(t) = self.flush_thread.take() {
            let _ = t.join();
        }
        flush_buffer(&self.db_path, &self.buffer, &self.state);
        if let Ok(db) = Database::open(&self.db_path) {
            let _ = queries::end_session(db.conn(), &self.session_id);
        }
        // listen thread may block until app exit; drop the handle to detach it for v1
        if let Some(t) = self.listen_thread.take() {
            drop(t);
        }
        self.state.lock().running = false;
    }

    pub fn set_paused(&self, paused: bool) {
        self.privacy.lock().set_paused(paused);
        self.state.lock().paused = paused;
    }

    pub fn is_paused(&self) -> bool {
        self.privacy.lock().is_paused()
    }

    pub fn update_blocklist(&self, patterns: Vec<String>) {
        self.privacy.lock().update_blocklist(patterns);
    }

    pub fn state(&self) -> CaptureState {
        self.state.lock().clone()
    }
}

fn flush_buffer(
    db_path: &std::path::Path,
    buffer: &Arc<Mutex<Vec<KeyEvent>>>,
    state: &Arc<Mutex<CaptureState>>,
) {
    let batch: Vec<KeyEvent> = {
        let mut buf = buffer.lock();
        if buf.is_empty() {
            return;
        }
        buf.drain(..).collect()
    };
    if let Ok(db) = Database::open(db_path) {
        let _ = queries::insert_events_batch(db.conn(), &batch);
        // Feed the analytics pipeline so passive typing actually updates the
        // error profile (backspace-correction inference + bigram timing).
        if let Some(first) = batch.first() {
            let _ = typr_analytics::rollup_session(db.conn(), &first.session_id, &batch);
        }
    }
    state.lock().events_buffered = buffer.lock().len();
}

fn run_listen(
    stop: Arc<AtomicBool>,
    buffer: Arc<Mutex<Vec<KeyEvent>>>,
    state: Arc<Mutex<CaptureState>>,
    privacy: Arc<Mutex<PrivacyFilter>>,
    session_id: String,
    _db_path: std::path::PathBuf,
) -> Result<(), String> {
    // Anchor timestamps to capture start so deltas between keystrokes are
    // meaningful (the old `Instant::now().elapsed()` was always ~0).
    let started = Instant::now();
    let callback = move |event: rdev::Event| {
        if stop.load(Ordering::SeqCst) {
            return;
        }
        let EventType::KeyPress(key) = event.event_type else {
            return;
        };

        let title = active_window_title();
        if !privacy.lock().should_capture(title.as_deref()) {
            return;
        }

        let key_str = key_to_string(key);
        let title_hash = title.as_ref().map(|t| PrivacyFilter::hash_title(t));

        buffer.lock().push(KeyEvent {
            session_id: session_id.clone(),
            key_code: key_str,
            event_type: "press".into(),
            ts_monotonic: started.elapsed().as_secs_f64(),
            app_bundle: None,
            window_title_hash: title_hash,
        });
        state.lock().events_buffered = buffer.lock().len();
    };

    rdev::listen(callback).map_err(|e| format!("rdev listen failed: {:?}", e))
}

fn active_window_title() -> Option<String> {
    active_win_pos_rs::get_active_window().ok().map(|w| w.title)
}

fn key_to_string(key: Key) -> String {
    if let Some(c) = key_to_char(key) {
        return c.to_string();
    }
    match key {
        Key::Backspace => "Backspace".into(),
        Key::Return => "Return".into(),
        Key::Tab => "Tab".into(),
        Key::Space => " ".into(),
        Key::Escape => "Escape".into(),
        Key::Delete => "Delete".into(),
        other => format!("{:?}", other),
    }
}

fn key_to_char(key: Key) -> Option<char> {
    use Key::*;
    let c = match key {
        KeyA => 'a',
        KeyB => 'b',
        KeyC => 'c',
        KeyD => 'd',
        KeyE => 'e',
        KeyF => 'f',
        KeyG => 'g',
        KeyH => 'h',
        KeyI => 'i',
        KeyJ => 'j',
        KeyK => 'k',
        KeyL => 'l',
        KeyM => 'm',
        KeyN => 'n',
        KeyO => 'o',
        KeyP => 'p',
        KeyQ => 'q',
        KeyR => 'r',
        KeyS => 's',
        KeyT => 't',
        KeyU => 'u',
        KeyV => 'v',
        KeyW => 'w',
        KeyX => 'x',
        KeyY => 'y',
        KeyZ => 'z',
        Num0 => '0',
        Num1 => '1',
        Num2 => '2',
        Num3 => '3',
        Num4 => '4',
        Num5 => '5',
        Num6 => '6',
        Num7 => '7',
        Num8 => '8',
        Num9 => '9',
        _ => return None,
    };
    Some(c)
}

impl Drop for CaptureHandle {
    fn drop(&mut self) {
        self.stop();
    }
}
