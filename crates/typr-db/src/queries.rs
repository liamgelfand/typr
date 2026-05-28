use crate::DbError;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyEvent {
    pub session_id: String,
    pub key_code: String,
    pub event_type: String,
    pub ts_monotonic: f64,
    pub app_bundle: Option<String>,
    pub window_title_hash: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Correction {
    pub session_id: String,
    pub typed_bigram: String,
    pub intended_bigram: Option<String>,
    pub confidence: f64,
    pub source: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BigramStat {
    pub bigram: String,
    pub error_count: i64,
    pub attempt_count: i64,
    pub delay_p50_ms: Option<f64>,
    pub delay_p95_ms: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DrillCard {
    pub id: String,
    pub prompt: String,
    pub target_keys: String,
    pub ease: f64,
    pub interval_days: i64,
    pub repetitions: i64,
    pub due_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionSummary {
    pub id: String,
    pub started_at: i64,
    pub ended_at: Option<i64>,
    pub session_type: String,
    pub event_count: i64,
}

pub fn create_session(conn: &Connection, id: &str, session_type: &str) -> Result<(), DbError> {
    let now = chrono::Utc::now().timestamp();
    conn.execute(
        "INSERT INTO sessions (id, started_at, session_type) VALUES (?1, ?2, ?3)",
        params![id, now, session_type],
    )?;
    Ok(())
}

pub fn end_session(conn: &Connection, id: &str) -> Result<(), DbError> {
    let now = chrono::Utc::now().timestamp();
    conn.execute(
        "UPDATE sessions SET ended_at = ?1 WHERE id = ?2",
        params![now, id],
    )?;
    Ok(())
}

pub fn insert_events_batch(conn: &Connection, events: &[KeyEvent]) -> Result<(), DbError> {
    if events.is_empty() {
        return Ok(());
    }
    let tx = conn.unchecked_transaction()?;
    {
        let mut stmt = tx.prepare(
            "INSERT INTO events (session_id, key_code, event_type, ts_monotonic, app_bundle, window_title_hash)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        )?;
        for e in events {
            stmt.execute(params![
                e.session_id,
                e.key_code,
                e.event_type,
                e.ts_monotonic,
                e.app_bundle,
                e.window_title_hash,
            ])?;
        }
    }
    tx.commit()?;
    Ok(())
}

pub fn insert_correction(conn: &Connection, c: &Correction) -> Result<(), DbError> {
    conn.execute(
        "INSERT INTO corrections (session_id, typed_bigram, intended_bigram, confidence, source)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            c.session_id,
            c.typed_bigram,
            c.intended_bigram,
            c.confidence,
            c.source
        ],
    )?;
    Ok(())
}

pub fn upsert_bigram_stat(
    conn: &Connection,
    bigram: &str,
    error_delta: i64,
    attempt_delta: i64,
    delay_ms: Option<f64>,
) -> Result<(), DbError> {
    let now = chrono::Utc::now().timestamp();
    conn.execute(
        "INSERT INTO bigram_stats (bigram, error_count, attempt_count, delay_p50_ms, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT(bigram) DO UPDATE SET
           error_count = error_count + excluded.error_count,
           attempt_count = attempt_count + excluded.attempt_count,
           delay_p50_ms = CASE
             WHEN delay_p50_ms IS NULL THEN excluded.delay_p50_ms
             WHEN excluded.delay_p50_ms IS NULL THEN delay_p50_ms
             ELSE (delay_p50_ms + excluded.delay_p50_ms) / 2.0
           END,
           updated_at = excluded.updated_at",
        params![
            bigram,
            error_delta.max(0),
            attempt_delta,
            delay_ms,
            now
        ],
    )?;
    Ok(())
}

pub fn get_top_weak_bigrams(conn: &Connection, limit: i64) -> Result<Vec<BigramStat>, DbError> {
    let mut stmt = conn.prepare(
        "SELECT bigram, error_count, attempt_count, delay_p50_ms, delay_p95_ms
         FROM bigram_stats
         WHERE attempt_count > 0
         ORDER BY (CAST(error_count AS REAL) / attempt_count) DESC, error_count DESC
         LIMIT ?1",
    )?;
    let rows = stmt.query_map([limit], |row| {
        Ok(BigramStat {
            bigram: row.get(0)?,
            error_count: row.get(1)?,
            attempt_count: row.get(2)?,
            delay_p50_ms: row.get(3)?,
            delay_p95_ms: row.get(4)?,
        })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(DbError::from)
}

pub fn get_slow_bigrams(conn: &Connection, limit: i64) -> Result<Vec<BigramStat>, DbError> {
    let mut stmt = conn.prepare(
        "SELECT bigram, error_count, attempt_count, delay_p50_ms, delay_p95_ms
         FROM bigram_stats
         WHERE delay_p50_ms IS NOT NULL
         ORDER BY delay_p50_ms DESC
         LIMIT ?1",
    )?;
    let rows = stmt.query_map([limit], |row| {
        Ok(BigramStat {
            bigram: row.get(0)?,
            error_count: row.get(1)?,
            attempt_count: row.get(2)?,
            delay_p50_ms: row.get(3)?,
            delay_p95_ms: row.get(4)?,
        })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(DbError::from)
}

pub fn get_setting(conn: &Connection, key: &str) -> Result<Option<String>, DbError> {
    let mut stmt = conn.prepare("SELECT value FROM settings WHERE key = ?1")?;
    let mut rows = stmt.query([key])?;
    if let Some(row) = rows.next()? {
        Ok(Some(row.get(0)?))
    } else {
        Ok(None)
    }
}

pub fn set_setting(conn: &Connection, key: &str, value: &str) -> Result<(), DbError> {
    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        params![key, value],
    )?;
    Ok(())
}

pub fn get_blocklist(conn: &Connection) -> Result<Vec<String>, DbError> {
    let mut stmt = conn.prepare("SELECT pattern FROM app_blocklist")?;
    let rows = stmt.query_map([], |row| row.get(0))?;
    rows.collect::<Result<Vec<_>, _>>().map_err(DbError::from)
}

pub fn add_blocklist_pattern(conn: &Connection, pattern: &str) -> Result<(), DbError> {
    conn.execute(
        "INSERT OR IGNORE INTO app_blocklist (pattern) VALUES (?1)",
        [pattern],
    )?;
    Ok(())
}

pub fn remove_blocklist_pattern(conn: &Connection, pattern: &str) -> Result<(), DbError> {
    conn.execute("DELETE FROM app_blocklist WHERE pattern = ?1", [pattern])?;
    Ok(())
}

pub fn get_recent_sessions(conn: &Connection, limit: i64) -> Result<Vec<SessionSummary>, DbError> {
    let mut stmt = conn.prepare(
        "SELECT s.id, s.started_at, s.ended_at, s.session_type,
                (SELECT COUNT(*) FROM events e WHERE e.session_id = s.id) as event_count
         FROM sessions s
         ORDER BY s.started_at DESC
         LIMIT ?1",
    )?;
    let rows = stmt.query_map([limit], |row| {
        Ok(SessionSummary {
            id: row.get(0)?,
            started_at: row.get(1)?,
            ended_at: row.get(2)?,
            session_type: row.get(3)?,
            event_count: row.get(4)?,
        })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(DbError::from)
}

pub fn upsert_drill_card(conn: &Connection, card: &DrillCard) -> Result<(), DbError> {
    conn.execute(
        "INSERT INTO drill_cards (id, prompt, target_keys, ease, interval_days, repetitions, due_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
         ON CONFLICT(id) DO UPDATE SET
           prompt = excluded.prompt,
           target_keys = excluded.target_keys,
           ease = excluded.ease,
           interval_days = excluded.interval_days,
           repetitions = excluded.repetitions,
           due_at = excluded.due_at",
        params![
            card.id,
            card.prompt,
            card.target_keys,
            card.ease,
            card.interval_days,
            card.repetitions,
            card.due_at
        ],
    )?;
    Ok(())
}

pub fn get_due_drill_cards(conn: &Connection, now: i64) -> Result<Vec<DrillCard>, DbError> {
    let mut stmt = conn.prepare(
        "SELECT id, prompt, target_keys, ease, interval_days, repetitions, due_at
         FROM drill_cards WHERE due_at <= ?1 ORDER BY due_at ASC",
    )?;
    let rows = stmt.query_map([now], |row| {
        Ok(DrillCard {
            id: row.get(0)?,
            prompt: row.get(1)?,
            target_keys: row.get(2)?,
            ease: row.get(3)?,
            interval_days: row.get(4)?,
            repetitions: row.get(5)?,
            due_at: row.get(6)?,
        })
    })?;
    rows.collect::<Result<Vec<_>, _>>().map_err(DbError::from)
}

pub fn export_all_json(conn: &Connection) -> Result<String, DbError> {
    let bigrams = get_top_weak_bigrams(conn, 1000)?;
    let sessions = get_recent_sessions(conn, 1000)?;
    let blocklist = get_blocklist(conn)?;
    let export = serde_json::json!({
        "bigram_stats": bigrams,
        "sessions": sessions,
        "blocklist": blocklist,
        "exported_at": chrono::Utc::now().timestamp(),
    });
    Ok(serde_json::to_string_pretty(&export)?)
}

pub fn delete_all_user_data(conn: &Connection) -> Result<(), DbError> {
    conn.execute_batch(
        "DELETE FROM events;
         DELETE FROM corrections;
         DELETE FROM bigram_stats;
         DELETE FROM drill_cards;
         DELETE FROM sessions;
         VACUUM;",
    )?;
    Ok(())
}

pub fn event_count(conn: &Connection) -> Result<i64, DbError> {
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM events", [], |r| r.get(0))?;
    Ok(count)
}
