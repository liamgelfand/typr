use serde::{Deserialize, Serialize};
use typr_db::BigramStat;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SubstitutionPair {
    pub typed: String,
    pub intended: String,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WeakBigram {
    pub bigram: String,
    pub error_rate: f64,
    pub error_count: i64,
    pub attempt_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorProfile {
    pub weak_bigrams: Vec<WeakBigram>,
    pub substitution_pairs: Vec<SubstitutionPair>,
    pub slow_bigrams: Vec<BigramStat>,
}

impl ErrorProfile {
    pub fn from_db_stats(
        weak: Vec<BigramStat>,
        slow: Vec<BigramStat>,
        substitutions: Vec<SubstitutionPair>,
    ) -> Self {
        let weak_bigrams = weak
            .into_iter()
            .map(|s| WeakBigram {
                bigram: s.bigram.clone(),
                error_rate: if s.attempt_count > 0 {
                    s.error_count as f64 / s.attempt_count as f64
                } else {
                    0.0
                },
                error_count: s.error_count,
                attempt_count: s.attempt_count,
            })
            .collect();

        Self {
            weak_bigrams,
            substitution_pairs: substitutions,
            slow_bigrams: slow,
        }
    }
}
