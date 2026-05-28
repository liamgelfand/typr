import type { DrillCard, WeakBigram } from "./types";

// A bank of common English words used to synthesise realistic typing material.
const WORD_BANK =
  `the be to of and a in that have it for not on with he as you do at this but his by from they we say her she or an will my one all would there their what so up out if about who get which go me when make can like time no just him know take people into year your good some could them see other than then now look only come its over think also back after use two how our work first well way even new want because any these give day most us are the and that have with this from`
    .split(/\s+/)
    .filter(Boolean);

const FALLBACK_VOWELS = ["a", "e", "i", "o", "u"];

/** Common pangrams / clean sentences used when there is no error profile yet. */
const STARTER_TEXTS = [
  "the quick brown fox jumps over the lazy dog",
  "pack my box with five dozen liquor jugs",
  "how vexingly quick daft zebras jump",
  "the five boxing wizards jump quickly",
  "we promptly judged antique ivory buckles",
];

function uniqueWordsContaining(bigram: string, limit: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of WORD_BANK) {
    if (w.includes(bigram) && !seen.has(w)) {
      seen.add(w);
      out.push(w);
      if (out.length >= limit) break;
    }
  }
  return out;
}

/** Build a clean, typeable practice line that hammers a single bigram. */
export function generateDrillText(bigram: string, words = 14): string {
  const real = uniqueWordsContaining(bigram, words);
  const tokens: string[] = [];

  // Lead with short bursts of the raw bigram to build muscle memory.
  tokens.push(bigram, bigram, bigram);

  if (real.length >= 4) {
    for (let i = 0; i < words; i++) tokens.push(real[i % real.length]);
  } else {
    // Rare bigram: synthesise simple syllables around it.
    for (let i = 0; i < words; i++) {
      const v = FALLBACK_VOWELS[i % FALLBACK_VOWELS.length];
      tokens.push(i % 2 === 0 ? `${bigram}${v}` : `${v}${bigram}`);
    }
  }
  return tokens.join(" ");
}

/**
 * Build a practice line. When weak bigrams are known, the text is biased toward
 * words that exercise them (keybr-style targeted practice); otherwise a clean
 * starter sentence is used.
 */
export function generatePracticeText(weak: WeakBigram[] = []): string {
  if (weak.length === 0) {
    return STARTER_TEXTS[Math.floor(Math.random() * STARTER_TEXTS.length)];
  }

  const focus = weak.slice(0, 4).map((w) => w.bigram);
  const tokens: string[] = [];
  let guard = 0;
  while (tokens.length < 16 && guard < 200) {
    guard++;
    const bg = focus[Math.floor(Math.random() * focus.length)];
    const matches = uniqueWordsContaining(bg, 8);
    if (matches.length > 0) {
      tokens.push(matches[Math.floor(Math.random() * matches.length)]);
    } else {
      tokens.push(bg + FALLBACK_VOWELS[tokens.length % FALLBACK_VOWELS.length]);
    }
  }
  if (tokens.length === 0) {
    return STARTER_TEXTS[Math.floor(Math.random() * STARTER_TEXTS.length)];
  }
  return tokens.join(" ");
}

export function generateDrillsFromWeakBigrams(
  weak: WeakBigram[],
  limit = 10
): DrillCard[] {
  const now = Math.floor(Date.now() / 1000);
  return weak.slice(0, limit).map((w) => ({
    id: `drill-${w.bigram}`,
    prompt: generateDrillText(w.bigram),
    target_keys: w.bigram,
    ease: 2.5,
    interval_days: 0,
    repetitions: 0,
    due_at: now,
  }));
}

/**
 * Derive an SM-2 quality score (0–5) from measured typing performance, so the
 * user never has to self-grade a drill.
 */
export function qualityFromPerformance(accuracy: number, errors: number): number {
  if (errors === 0 && accuracy >= 99) return 5;
  if (accuracy >= 97) return 4;
  if (accuracy >= 93) return 3;
  if (accuracy >= 88) return 2;
  if (accuracy >= 80) return 1;
  return 0;
}

export function sm2Review(card: DrillCard, quality: number): DrillCard {
  let { ease, interval_days, repetitions } = card;

  if (quality < 3) {
    repetitions = 0;
    interval_days = 1;
  } else {
    if (repetitions === 0) interval_days = 1;
    else if (repetitions === 1) interval_days = 6;
    else interval_days = Math.round(interval_days * ease);
    repetitions += 1;
  }

  ease = Math.max(
    1.3,
    ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );

  return {
    ...card,
    ease,
    interval_days,
    repetitions,
    due_at: Math.floor(Date.now() / 1000) + interval_days * 86400,
  };
}
