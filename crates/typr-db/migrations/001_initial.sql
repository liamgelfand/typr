PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY NOT NULL,
    started_at INTEGER NOT NULL,
    ended_at INTEGER,
    session_type TEXT NOT NULL DEFAULT 'passive',
    words_estimate INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL REFERENCES sessions(id),
    key_code TEXT NOT NULL,
    event_type TEXT NOT NULL,
    ts_monotonic REAL NOT NULL,
    app_bundle TEXT,
    window_title_hash TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts_monotonic);

CREATE TABLE IF NOT EXISTS corrections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL REFERENCES sessions(id),
    typed_bigram TEXT NOT NULL,
    intended_bigram TEXT,
    confidence REAL NOT NULL DEFAULT 0.5,
    source TEXT NOT NULL DEFAULT 'backspace',
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_corrections_session ON corrections(session_id);

CREATE TABLE IF NOT EXISTS bigram_stats (
    bigram TEXT PRIMARY KEY NOT NULL,
    error_count INTEGER NOT NULL DEFAULT 0,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    delay_p50_ms REAL,
    delay_p95_ms REAL,
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE TABLE IF NOT EXISTS drill_cards (
    id TEXT PRIMARY KEY NOT NULL,
    prompt TEXT NOT NULL,
    target_keys TEXT NOT NULL,
    ease REAL NOT NULL DEFAULT 2.5,
    interval_days INTEGER NOT NULL DEFAULT 0,
    repetitions INTEGER NOT NULL DEFAULT 0,
    due_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_drill_due ON drill_cards(due_at);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_blocklist (
    pattern TEXT PRIMARY KEY NOT NULL
);

INSERT OR IGNORE INTO settings (key, value) VALUES ('capture_enabled', 'false');
INSERT OR IGNORE INTO settings (key, value) VALUES ('onboarding_complete', 'false');
INSERT OR IGNORE INTO settings (key, value) VALUES ('pause_hotkey', 'CmdOrCtrl+Shift+P');
INSERT OR IGNORE INTO app_blocklist (pattern) VALUES ('1Password');
INSERT OR IGNORE INTO app_blocklist (pattern) VALUES ('KeePass');
INSERT OR IGNORE INTO app_blocklist (pattern) VALUES ('Bitwarden');
INSERT OR IGNORE INTO app_blocklist (pattern) VALUES ('password');
INSERT OR IGNORE INTO app_blocklist (pattern) VALUES ('sudo');
INSERT OR IGNORE INTO app_blocklist (pattern) VALUES ('Terminal');
