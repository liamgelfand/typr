use parking_lot::Mutex;
use std::path::PathBuf;
use typr_capture::CaptureHandle;
use typr_db::Database;

pub struct AppState {
    pub db: Mutex<Database>,
    pub db_path: PathBuf,
    pub capture: Mutex<Option<CaptureHandle>>,
}

impl AppState {
    pub fn new(db_path: PathBuf) -> Result<Self, String> {
        let db = Database::open(&db_path).map_err(|e| e.to_string())?;
        Ok(Self {
            db: Mutex::new(db),
            db_path,
            capture: Mutex::new(None),
        })
    }
}

pub fn db_dir() -> PathBuf {
    dirs::data_local_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("typr")
}
