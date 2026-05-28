use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};

pub struct PrivacyFilter {
    blocklist: Vec<String>,
    paused: bool,
}

impl PrivacyFilter {
    pub fn new(blocklist: Vec<String>) -> Self {
        Self {
            blocklist,
            paused: false,
        }
    }

    pub fn set_paused(&mut self, paused: bool) {
        self.paused = paused;
    }

    pub fn is_paused(&self) -> bool {
        self.paused
    }

    pub fn update_blocklist(&mut self, patterns: Vec<String>) {
        self.blocklist = patterns;
    }

    pub fn should_capture(&self, window_title: Option<&str>) -> bool {
        if self.paused {
            return false;
        }
        let Some(title) = window_title else {
            return true;
        };
        let lower = title.to_lowercase();
        !self
            .blocklist
            .iter()
            .any(|p| lower.contains(&p.to_lowercase()))
    }

    pub fn hash_title(title: &str) -> String {
        let mut hasher = DefaultHasher::new();
        title.hash(&mut hasher);
        format!("{:016x}", hasher.finish())
    }
}
