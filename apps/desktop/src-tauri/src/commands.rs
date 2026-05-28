use crate::state::AppState;
use serde::{Deserialize, Serialize};
use tauri::State;
use typr_analytics::ErrorProfile;
use typr_db::{queries, Correction, DrillCard};
use uuid::Uuid;

#[derive(Serialize)]
pub struct CaptureStatus {
    pub running: bool,
    pub paused: bool,
    pub events_buffered: usize,
}

/// A single wrong keystroke captured during a typing run. `prev` is the
/// character correctly typed just before, so we can attribute the error to a
/// bigram.
#[derive(Deserialize)]
pub struct TypingMiss {
    pub prev: Option<String>,
    pub expected: String,
    pub typed: String,
}

#[derive(Deserialize)]
pub struct TypingRun {
    pub kind: String,
    pub target: String,
    pub duration_ms: f64,
    pub keystrokes: i64,
    pub misses: Vec<TypingMiss>,
}

#[derive(Serialize)]
pub struct TypingStats {
    pub wpm: f64,
    pub accuracy: f64,
    pub errors: i64,
}

#[tauri::command]
pub fn get_onboarding_complete(state: State<'_, AppState>) -> Result<bool, String> {
    Ok(queries::get_setting(state.db.lock().conn(), "onboarding_complete")
        .map_err(|e| e.to_string())?
        .map(|v| v == "true")
        .unwrap_or(false))
}

#[tauri::command]
pub fn set_onboarding_complete(state: State<'_, AppState>) -> Result<(), String> {
    let db = state.db.lock();
    queries::set_setting(db.conn(), "onboarding_complete", "true").map_err(|e| e.to_string())?;
    // Consent was just granted, so opt the user into passive capture by default.
    queries::set_setting(db.conn(), "capture_enabled", "true").map_err(|e| e.to_string())?;
    Ok(())
}

/// Start the passive capture pipeline if it isn't already running. Shared by
/// the `start_capture` command and the automatic start-on-launch path.
pub fn ensure_capture_started(state: &AppState) -> Result<(), String> {
    let mut guard = state.capture.lock();
    if guard.is_some() {
        return Ok(());
    }
    let blocklist = {
        let db = state.db.lock();
        queries::get_blocklist(db.conn()).map_err(|e| e.to_string())?
    };
    let session_id = Uuid::new_v4().to_string();
    let handle = typr_capture::CaptureHandle::start(
        typr_capture::CaptureConfig {
            db_path: state.db_path.clone(),
            session_id,
        },
        blocklist,
    )?;
    {
        let db = state.db.lock();
        queries::set_setting(db.conn(), "capture_enabled", "true").map_err(|e| e.to_string())?;
    }
    *guard = Some(handle);
    Ok(())
}

#[tauri::command]
pub fn start_capture(state: State<'_, AppState>) -> Result<CaptureStatus, String> {
    ensure_capture_started(&state)?;
    let guard = state.capture.lock();
    Ok(capture_status_from_guard(&guard))
}

#[tauri::command]
pub fn stop_capture(state: State<'_, AppState>) -> Result<CaptureStatus, String> {
    let mut guard = state.capture.lock();
    if let Some(mut handle) = guard.take() {
        handle.stop();
    }
    queries::set_setting(state.db.lock().conn(), "capture_enabled", "false")
        .map_err(|e| e.to_string())?;
    Ok(CaptureStatus {
        running: false,
        paused: false,
        events_buffered: 0,
    })
}

#[tauri::command]
pub fn toggle_pause_capture(state: State<'_, AppState>) -> Result<CaptureStatus, String> {
    let guard = state.capture.lock();
    if let Some(handle) = guard.as_ref() {
        let paused = !handle.is_paused();
        handle.set_paused(paused);
    }
    Ok(capture_status_from_guard(&guard))
}

#[tauri::command]
pub fn get_capture_status(state: State<'_, AppState>) -> Result<CaptureStatus, String> {
    let guard = state.capture.lock();
    Ok(capture_status_from_guard(&guard))
}

fn capture_status_from_guard(guard: &parking_lot::MutexGuard<Option<typr_capture::CaptureHandle>>) -> CaptureStatus {
    if let Some(handle) = guard.as_ref() {
        let s = handle.state();
        CaptureStatus {
            running: s.running,
            paused: s.paused,
            events_buffered: s.events_buffered,
        }
    } else {
        CaptureStatus {
            running: false,
            paused: false,
            events_buffered: 0,
        }
    }
}

#[tauri::command]
pub fn get_error_profile(state: State<'_, AppState>) -> Result<ErrorProfile, String> {
    let weak = queries::get_top_weak_bigrams(state.db.lock().conn(), 20).map_err(|e| e.to_string())?;
    let slow = queries::get_slow_bigrams(state.db.lock().conn(), 20).map_err(|e| e.to_string())?;
    Ok(ErrorProfile::from_db_stats(weak, slow, vec![]))
}

#[tauri::command]
pub fn get_sessions(state: State<'_, AppState>) -> Result<Vec<typr_db::SessionSummary>, String> {
    queries::get_recent_sessions(state.db.lock().conn(), 30).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_blocklist(state: State<'_, AppState>) -> Result<Vec<String>, String> {
    queries::get_blocklist(state.db.lock().conn()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn add_blocklist_pattern(state: State<'_, AppState>, pattern: String) -> Result<(), String> {
    queries::add_blocklist_pattern(state.db.lock().conn(), &pattern).map_err(|e| e.to_string())?;
    if let Some(handle) = state.capture.lock().as_ref() {
        let list = queries::get_blocklist(state.db.lock().conn()).map_err(|e| e.to_string())?;
        handle.update_blocklist(list);
    }
    Ok(())
}

#[tauri::command]
pub fn remove_blocklist_pattern(state: State<'_, AppState>, pattern: String) -> Result<(), String> {
    queries::remove_blocklist_pattern(state.db.lock().conn(), &pattern).map_err(|e| e.to_string())?;
    if let Some(handle) = state.capture.lock().as_ref() {
        let list = queries::get_blocklist(state.db.lock().conn()).map_err(|e| e.to_string())?;
        handle.update_blocklist(list);
    }
    Ok(())
}

#[tauri::command]
pub fn export_data(state: State<'_, AppState>) -> Result<String, String> {
    queries::export_all_json(state.db.lock().conn()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_all_data(state: State<'_, AppState>) -> Result<(), String> {
    let mut guard = state.capture.lock();
    if let Some(mut handle) = guard.take() {
        handle.stop();
    }
    queries::delete_all_user_data(state.db.lock().conn()).map_err(|e| e.to_string())
}

fn is_bigram_char(c: char) -> bool {
    c.is_alphanumeric()
}

/// Persist a completed typing run (practice or drill). The frontend validates
/// every keystroke, so we receive the exact set of wrong keystrokes and the
/// true elapsed time rather than re-deriving them from a final string.
#[tauri::command]
pub fn record_typing(state: State<'_, AppState>, run: TypingRun) -> Result<TypingStats, String> {
    let session_kind = if run.kind == "drill" { "drill" } else { "practice" };
    let session_id = Uuid::new_v4().to_string();

    {
        let db = state.db.lock();
        let conn = db.conn();
        queries::create_session(conn, &session_id, session_kind).map_err(|e| e.to_string())?;

        // Every adjacent letter/number pair the user got through counts as a
        // bigram attempt, so error rates are meaningful (not always ~100%).
        let chars: Vec<char> = run.target.chars().collect();
        for w in chars.windows(2) {
            if is_bigram_char(w[0]) && is_bigram_char(w[1]) {
                let bigram = format!("{}{}", w[0], w[1]);
                queries::upsert_bigram_stat(conn, &bigram, 0, 1, None).map_err(|e| e.to_string())?;
            }
        }

        for m in &run.misses {
            let intended_bigram = m.prev.as_ref().map(|p| format!("{}{}", p, m.expected));
            let typed_bigram = format!("{}{}", m.prev.clone().unwrap_or_default(), m.typed);
            queries::insert_correction(
                conn,
                &Correction {
                    session_id: session_id.clone(),
                    typed_bigram,
                    intended_bigram: intended_bigram.clone(),
                    confidence: 1.0,
                    source: session_kind.to_string(),
                },
            )
            .map_err(|e| e.to_string())?;
            if let Some(intended) = intended_bigram {
                queries::upsert_bigram_stat(conn, &intended, 1, 0, None)
                    .map_err(|e| e.to_string())?;
            }
        }

        queries::end_session(conn, &session_id).map_err(|e| e.to_string())?;
    }

    let target_chars = run.target.chars().count() as f64;
    let errors = run.misses.len() as i64;
    let wpm = if run.duration_ms > 0.0 {
        (target_chars / 5.0) / (run.duration_ms / 60000.0)
    } else {
        0.0
    };
    let accuracy = if run.keystrokes > 0 {
        ((run.keystrokes - errors).max(0) as f64 / run.keystrokes as f64) * 100.0
    } else {
        100.0
    };

    Ok(TypingStats {
        wpm,
        accuracy,
        errors,
    })
}

#[tauri::command]
pub fn get_due_drills(state: State<'_, AppState>) -> Result<Vec<DrillCard>, String> {
    let now = chrono::Utc::now().timestamp();
    queries::get_due_drill_cards(state.db.lock().conn(), now).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn save_drill_cards(state: State<'_, AppState>, cards: Vec<DrillCard>) -> Result<(), String> {
    for card in cards {
        queries::upsert_drill_card(state.db.lock().conn(), &card).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn get_event_count(state: State<'_, AppState>) -> Result<i64, String> {
    queries::event_count(state.db.lock().conn()).map_err(|e| e.to_string())
}
