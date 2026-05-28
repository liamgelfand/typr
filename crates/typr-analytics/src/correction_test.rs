#[cfg(test)]
mod tests {
    use super::super::correction::{infer_corrections_from_buffer, practice_errors, KeyBufferEntry};

    #[test]
    fn detects_backspace_correction() {
        let buffer = vec![
            KeyBufferEntry { key: "t".into(), ts: 0.0 },
            KeyBufferEntry { key: "h".into(), ts: 0.1 },
            KeyBufferEntry { key: "e".into(), ts: 0.2 },
            KeyBufferEntry { key: "Backspace".into(), ts: 0.3 },
        ];
        let corrections = infer_corrections_from_buffer(&buffer);
        assert!(!corrections.is_empty());
    }

    #[test]
    fn practice_mode_finds_mismatch() {
        let errors = practice_errors("the", "tha");
        assert!(!errors.is_empty());
    }
}
