export interface CaptureStatus {
  running: boolean;
  paused: boolean;
  events_buffered: number;
}

export interface BigramStat {
  bigram: string;
  error_count: number;
  attempt_count: number;
  delay_p50_ms: number | null;
  delay_p95_ms: number | null;
}

export interface WeakBigram {
  bigram: string;
  error_rate: number;
  error_count: number;
  attempt_count: number;
}

export interface ErrorProfile {
  weak_bigrams: WeakBigram[];
  substitution_pairs: { typed: string; intended: string; count: number }[];
  slow_bigrams: BigramStat[];
}

export interface SessionSummary {
  id: string;
  started_at: number;
  ended_at: number | null;
  session_type: string;
  event_count: number;
}

export interface DrillCard {
  id: string;
  prompt: string;
  target_keys: string;
  ease: number;
  interval_days: number;
  repetitions: number;
  due_at: number;
}

export interface TypingMiss {
  prev: string | null;
  expected: string;
  typed: string;
  index?: number;
}

export interface TypingRun {
  kind: "practice" | "drill";
  target: string;
  duration_ms: number;
  keystrokes: number;
  misses: TypingMiss[];
}

export interface TypingStats {
  wpm: number;
  accuracy: number;
  errors: number;
}
