use crate::DbError;
use rusqlite::Connection;

const MIGRATION_001: &str = include_str!("../migrations/001_initial.sql");

pub fn run(conn: &Connection) -> Result<(), DbError> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS _migrations (
            version INTEGER PRIMARY KEY,
            applied_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
        );",
    )?;

    let version: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(version), 0) FROM _migrations",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    if version < 1 {
        conn.execute_batch(MIGRATION_001)?;
        conn.execute("INSERT INTO _migrations (version) VALUES (1)", [])?;
    }

    Ok(())
}
