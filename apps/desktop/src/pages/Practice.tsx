import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api";
import { PracticeVsDrills } from "../components/PracticeVsDrills";
import { RoundReview } from "../components/RoundReview";
import { TypingTest, type TypingRunResult } from "../components/TypingTest";
import { generatePracticeText } from "../drill-engine";
import type { TypingStats, WeakBigram } from "../types";

interface Round {
  text: string;
  result: TypingRunResult;
  stats: TypingStats;
}

export function Practice() {
  const [text, setText] = useState(() => generatePracticeText());
  const [round, setRound] = useState(0);
  // The just-completed line, kept on screen until the user starts the next one.
  const [review, setReview] = useState<Round | null>(null);
  // Most recent rounds, newest last — drives the persistent stats + deltas.
  const [history, setHistory] = useState<Round[]>([]);
  const weakRef = useRef<WeakBigram[]>([]);

  useEffect(() => {
    api.getErrorProfile().then((p) => {
      weakRef.current = p.weak_bigrams;
      if (round === 0) setText(generatePracticeText(p.weak_bigrams));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const next = useCallback(() => {
    setReview(null);
    setText(generatePracticeText(weakRef.current));
    setRound((r) => r + 1);
  }, []);

  const onComplete = useCallback(
    async (res: TypingRunResult) => {
      const stats = await api.recordTyping({
        kind: "practice",
        target: text,
        duration_ms: res.durationMs,
        keystrokes: res.keystrokes,
        misses: res.misses,
      });
      const completed: Round = { text, result: res, stats };
      setReview(completed);
      setHistory((h) => [...h, completed].slice(-20));
      // Refresh the profile so the next text targets current weak spots.
      api.getErrorProfile().then((p) => (weakRef.current = p.weak_bigrams));
    },
    [text]
  );

  const latest = history[history.length - 1] ?? null;
  const prev = history[history.length - 2] ?? null;

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <h2 className="text-3xl font-bold tracking-tight">Practice</h2>
        <p className="mt-1 text-sm text-slate-400">
          Free-flowing lines built from real words, weighted toward the
          letter-pairs you miss most. A wrong key is marked instantly and you
          must hit the right key to move on — no take-backs.
        </p>
      </header>

      <PracticeVsDrills active="practice" />

      {latest && (
        <ScoreBar latest={latest.stats} prev={prev?.stats ?? null} round={history.length} />
      )}

      {review ? (
        <div className="space-y-5">
          <RoundReview text={review.text} misses={review.result.misses} />
          <div className="flex justify-center">
            <button
              onClick={next}
              autoFocus
              className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:opacity-90"
            >
              Next line →
            </button>
          </div>
          <p className="text-center text-xs text-slate-500">
            Your score stays pinned above so you can compare it with the next
            round.
          </p>
        </div>
      ) : (
        <TypingTest
          key={round}
          text={text}
          onComplete={onComplete}
          label="Practice line"
        />
      )}
    </div>
  );
}

function ScoreBar({
  latest,
  prev,
  round,
}: {
  latest: TypingStats;
  prev: TypingStats | null;
  round: number;
}) {
  return (
    <div className="animate-fade-in-up mb-6 rounded-2xl border border-white/10 bg-slate-900/60 p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Last round{prev ? " · vs previous" : ""}
        </p>
        <p className="text-xs text-slate-500">Round {round}</p>
      </div>
      <div className="grid grid-cols-3 gap-8">
        <Stat
          label="WPM"
          value={Math.round(latest.wpm).toString()}
          delta={prev ? latest.wpm - prev.wpm : null}
          digits={0}
          higherIsBetter
          accent
        />
        <Stat
          label="Accuracy"
          value={`${latest.accuracy.toFixed(1)}%`}
          delta={prev ? latest.accuracy - prev.accuracy : null}
          digits={1}
          unit="%"
          higherIsBetter
        />
        <Stat
          label="Errors"
          value={latest.errors.toString()}
          delta={prev ? latest.errors - prev.errors : null}
          digits={0}
          higherIsBetter={false}
          danger={latest.errors > 0}
        />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  delta,
  digits,
  unit,
  higherIsBetter,
  accent,
  danger,
}: {
  label: string;
  value: string;
  delta?: number | null;
  digits?: number;
  unit?: string;
  higherIsBetter?: boolean;
  accent?: boolean;
  danger?: boolean;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <p
          className={`text-2xl font-bold tabular-nums ${
            accent ? "text-indigo-300" : danger ? "text-rose-400" : "text-slate-100"
          }`}
        >
          {value}
        </p>
        {delta != null && Math.abs(delta) >= (digits === 1 ? 0.05 : 0.5) && (
          <Delta delta={delta} digits={digits ?? 0} unit={unit} higherIsBetter={!!higherIsBetter} />
        )}
      </div>
    </div>
  );
}

function Delta({
  delta,
  digits,
  unit,
  higherIsBetter,
}: {
  delta: number;
  digits: number;
  unit?: string;
  higherIsBetter: boolean;
}) {
  const up = delta > 0;
  const good = higherIsBetter ? up : !up;
  const sign = up ? "+" : "−";
  return (
    <span
      className={`text-xs font-semibold ${good ? "text-emerald-400" : "text-rose-400"}`}
    >
      {up ? "▲" : "▼"} {sign}
      {Math.abs(delta).toFixed(digits)}
      {unit ?? ""}
    </span>
  );
}
