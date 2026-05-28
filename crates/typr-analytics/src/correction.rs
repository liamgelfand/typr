use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyBufferEntry {
    pub key: String,
    pub ts: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CorrectionCandidate {
    pub typed_bigram: String,
    pub intended_bigram: Option<String>,
    pub confidence: f64,
    pub source: String,
}

/// Infer corrections from a keystroke buffer using backspace-burst heuristics.
pub fn infer_corrections_from_buffer(buffer: &[KeyBufferEntry]) -> Vec<CorrectionCandidate> {
    let mut results = Vec::new();
    let mut typed_chars: Vec<char> = Vec::new();

    for entry in buffer {
        let key = entry.key.as_str();
        if key == "Backspace" {
            if typed_chars.len() >= 2 {
                let wrong = typed_chars[typed_chars.len() - 2];
                let maybe_intended = typed_chars.last().copied();
                if let Some(prev) = typed_chars.get(typed_chars.len().saturating_sub(3)).copied() {
                    let typed_bigram = format!("{}{}", prev, wrong);
                    let intended_bigram = maybe_intended.map(|c| format!("{}{}", prev, c));
                    let has_intended = intended_bigram.is_some();
                    results.push(CorrectionCandidate {
                        typed_bigram,
                        intended_bigram,
                        confidence: if has_intended { 0.75 } else { 0.5 },
                        source: "backspace".into(),
                    });
                }
            }
            typed_chars.pop();
            continue;
        }

        if key.len() == 1 {
            if let Some(c) = key.chars().next() {
                if !c.is_control() {
                    typed_chars.push(c);
                }
            }
        }
    }

    results
}

/// Compare practice input against target for ground-truth errors.
pub fn practice_errors(target: &str, typed: &str) -> Vec<CorrectionCandidate> {
    let mut results = Vec::new();
    let t_chars: Vec<char> = target.chars().collect();
    let y_chars: Vec<char> = typed.chars().collect();
    let len = t_chars.len().min(y_chars.len());

    for i in 1..len {
        if t_chars[i] != y_chars[i] {
            let intended = format!("{}{}", t_chars[i - 1], t_chars[i]);
            let typed_bg = format!("{}{}", y_chars[i - 1], y_chars[i]);
            results.push(CorrectionCandidate {
                typed_bigram: typed_bg,
                intended_bigram: Some(intended),
                confidence: 1.0,
                source: "practice".into(),
            });
        }
    }

    results
}
