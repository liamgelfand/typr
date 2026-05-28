import type { DrillCard, WeakBigram } from "./types";

// A bank of common English words. Practice and drills are always built from
// these real words — we never synthesise random letter combinations.
const WORD_BANK = `the of and to a in is it you that he was for on are with as his they at be this from i have or by one had not but what all were when we there can an your which their said if do will each about how up out them then she many some so these would other into has more her two like him see time could no make than first been its who now people my made over did down only way find use may water long little very after words called just where most know get through back much before go good new write our used me man too any day same right look think also around another came come work three must because does part even place well such here take why help put different away again off went old number great tell men say small every found still between name should home big give air line set own under read last never us left end along while might next sound below saw something thought both few those always looked show large often together asked house don world going want school important until form food keep children feet land side without boy once animal life enough took sometimes four head above kind began almost live page got earth need far hand high year mother light parts country father let night following picture being study second eye soon times story boys since white days ever paper hard near sentence better best across during today others however sure means knew it`
  .split(/\s+/)
  .filter((w) => w.length > 0);

// Pre-compute lowercase, de-duplicated word list.
const WORDS = Array.from(new Set(WORD_BANK.map((w) => w.toLowerCase())));

function randItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function wordsContaining(fragment: string): string[] {
  return WORDS.filter((w) => w.includes(fragment));
}

/** Only letter-pair bigrams make sense as a typing focus. */
function usableBigrams(weak: WeakBigram[]): string[] {
  return weak.map((w) => w.bigram.toLowerCase()).filter((bg) => /^[a-z]{2}$/.test(bg));
}

/**
 * Build a practice line out of REAL words. When weak bigrams are known the word
 * selection is biased toward words that exercise them, but every token is
 * always a genuine word — never a synthetic syllable.
 */
export function generatePracticeText(weak: WeakBigram[] = [], words = 14): string {
  const focus = usableBigrams(weak).slice(0, 6);
  const out: string[] = [];
  let last = "";

  for (let i = 0; i < words; i++) {
    let word: string | undefined;

    // ~65% of the time, target a weak bigram (if any matching words exist).
    if (focus.length > 0 && Math.random() < 0.65) {
      const matches = wordsContaining(randItem(focus));
      if (matches.length > 0) word = randItem(matches);
    }
    if (!word) word = randItem(WORDS);

    // Avoid an immediate repeat for nicer-reading lines.
    if (word === last && WORDS.length > 1) {
      i--;
      continue;
    }
    out.push(word);
    last = word;
  }

  return out.join(" ");
}

/**
 * Build a drill line for a single bigram out of real words that contain it,
 * padded with common words if the bigram is rare. No raw bigram bursts, no
 * synthetic syllables.
 */
export function generateDrillText(bigram: string, words = 14): string {
  const bg = bigram.toLowerCase();
  const matches = [...wordsContaining(bg)];
  // shuffle matches for variety
  for (let i = matches.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [matches[i], matches[j]] = [matches[j], matches[i]];
  }

  const out: string[] = [];
  let last = "";
  for (let i = 0; i < words; i++) {
    let word: string;
    if (matches.length > 0 && (Math.random() < 0.7 || out.length < 2)) {
      word = matches[i % matches.length];
    } else {
      word = randItem(WORDS);
    }
    if (word === last && WORDS.length > 1) {
      i--;
      continue;
    }
    out.push(word);
    last = word;
  }
  return out.join(" ");
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
