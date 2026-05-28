import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api";
import { TypingTest, type TypingRunResult } from "../components/TypingTest";
import { generatePracticeText } from "../drill-engine";
import type { TypingStats, WeakBigram } from "../types";

const ADVANCE_MS = 1900;

export function Practice() {
  const [text, setText] = useState(() => generatePracticeText());
  const [round, setRound] = useState(0);
  const [result, setResult] = useState<TypingRunResult | null>(null);
  const [stats, setStats] = useState<TypingStats | null>(null);
  const weakRef = useRef<WeakBigram[]>([]);
  const advanceRef = useRef<number | null>(null);

  useEffect(() => {
    api.getErrorProfile().then((p) => {
      weakRef.current = p.weak_bigrams;
      if (round === 0) setText(generatePracticeText(p.weak_bigrams));
    });
    return () => {
      if (advanceRef.current) window.clearTimeout(advanceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const next = useCallback(() => {
    if (advanceRef.current) window.clearTimeout(advanceRef.current);
    setResult(null);
    setStats(null);
    setText(generatePracticeText(weakRef.current));
    setRound((r) => r + 1);
  }, []);

  const onComplete = useCallback(
    async (res: TypingRunResult) => {
      setResult(res);
      const s = await api.recordTyping({
        kind: "practice",
        target: text,
        duration_ms: res.durationMs,
        keystrokes: res.keystrokes,
        misses: res.misses,
      });
      setStats(s);
      // Refresh the profile so the next text targets current weak spots.
      api.getErrorProfile().then((p) => (weakRef.current = p.weak_bigrams));
      advanceRef.current = window.setTimeout(next, ADVANCE_MS);
    },
    [text, next]
  );

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight">Practice</h2>
        <p className="mt-1 text-sm text-slate-400">
          Type each line exactly. A wrong key is marked instantly and you must
          hit the right key to move on — no take-backs. Lines adapt to your weak
          spots.
        </p>
      </header>

      <TypingTest
        key={round}
        text={text}
        onComplete={onComplete}
        label="Practice line"
      />

      <div className="mt-6 h-24">
        {result && stats ? (
          <div className="animate-fade-in-up flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/60 p-5">
            <div className="grid grid-cols-3 gap-8">
              <Stat label="WPM" value={Math.round(stats.wpm).toString()} accent />
              <Stat label="Accuracy" value={`${stats.accuracy.toFixed(1)}%`} />
              <Stat
                label="Errors"
                value={stats.errors.toString()}
                danger={stats.errors > 0}
              />
            </div>
            <button
              onClick={next}
              className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:opacity-90"
            >
              Next line →
            </button>
          </div>
        ) : (
          <p className="pt-2 text-center text-xs text-slate-500">
            Finish the line to see your stats and continue automatically.
          </p>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
  danger,
}: {
  label: string;
  value: string;
  accent?: boolean;
  danger?: boolean;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
      <p
        className={`mt-1 text-2xl font-bold tabular-nums ${
          accent ? "text-indigo-300" : danger ? "text-rose-400" : "text-slate-100"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
