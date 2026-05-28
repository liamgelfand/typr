use crate::correction::{infer_corrections_from_buffer, KeyBufferEntry};
use rusqlite::Connection;
use typr_db::{queries, Correction, KeyEvent};

pub fn rollup_session(conn: &Connection, session_id: &str, events: &[KeyEvent]) -> Result<(), String> {
    let buffer: Vec<KeyBufferEntry> = events
        .iter()
        .filter(|e| e.event_type == "press")
        .map(|e| KeyBufferEntry {
            key: e.key_code.clone(),
            ts: e.ts_monotonic,
        })
        .collect();

    let corrections = infer_corrections_from_buffer(&buffer);
    for c in &corrections {
        queries::insert_correction(
            conn,
            &Correction {
                session_id: session_id.to_string(),
                typed_bigram: c.typed_bigram.clone(),
                intended_bigram: c.intended_bigram.clone(),
                confidence: c.confidence,
                source: c.source.clone(),
            },
        )
        .map_err(|e| e.to_string())?;

        queries::upsert_bigram_stat(conn, &c.typed_bigram, 1, 1, None)
            .map_err(|e| e.to_string())?;
    }

    // Bigram timing from consecutive press events
    let presses: Vec<_> = events
        .iter()
        .filter(|e| e.event_type == "press" && e.key_code.len() == 1)
        .collect();

    for window in presses.windows(2) {
        let delay_ms = (window[1].ts_monotonic - window[0].ts_monotonic) * 1000.0;
        if delay_ms > 0.0 && delay_ms < 5000.0 {
            let bigram = format!("{}{}", window[0].key_code, window[1].key_code);
            queries::upsert_bigram_stat(conn, &bigram, 0, 1, Some(delay_ms))
                .map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

pub fn rollup_practice_corrections(
    conn: &Connection,
    session_id: &str,
    candidates: &[crate::correction::CorrectionCandidate],
) -> Result<(), String> {
    for c in candidates {
        queries::insert_correction(
            conn,
            &Correction {
                session_id: session_id.to_string(),
                typed_bigram: c.typed_bigram.clone(),
                intended_bigram: c.intended_bigram.clone(),
                confidence: c.confidence,
                source: c.source.clone(),
            },
        )
        .map_err(|e| e.to_string())?;

        queries::upsert_bigram_stat(conn, &c.typed_bigram, 1, 1, None)
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}
