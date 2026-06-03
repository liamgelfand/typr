import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api";
import { PracticeVsDrills } from "../components/PracticeVsDrills";
import { TypingTest, type TypingRunResult } from "../components/TypingTest";
import {
  generateDrillsFromWeakBigrams,
  qualityFromPerformance,
  sm2Review,
} from "../drill-engine";
import type { DrillCard, TypingStats } from "../types";

const ADVANCE_MS = 1900;

export function Drills() {
  const [cards, setCards] = useState<DrillCard[]>([]);
  const [index, setIndex] = useState(0);
  const [stats, setStats] = useState<TypingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const advanceRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let due = await api.getDueDrills();
    if (due.length === 0) {
      const profile = await api.getErrorProfile();
      const generated = generateDrillsFromWeakBigrams(profile.weak_bigrams);
      if (generated.length > 0) {
        await api.saveDrillCards(generated);
        due = generated;
      }
    }
    setCards(due);
    setIndex(0);
    setStats(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    return () => {
      if (advanceRef.current) window.clearTimeout(advanceRef.current);
    };
  }, [load]);

  const advance = useCallback(() => {
    if (advanceRef.current) window.clearTimeout(advanceRef.current);
    setStats(null);
    setIndex((i) => {
      if (i + 1 < cards.length) return i + 1;
      load();
      return 0;
    });
  }, [cards.length, load]);

  const onComplete = useCallback(
    async (res: TypingRunResult) => {
      const card = cards[index];
      if (!card) return;
      const s = await api.recordTyping({
        kind: "drill",
        target: card.prompt,
        duration_ms: res.durationMs,
        keystrokes: res.keystrokes,
        misses: res.misses,
      });
      setStats(s);
      const quality = qualityFromPerformance(s.accuracy, s.errors);
      await api.saveDrillCards([sm2Review(card, quality)]);
      advanceRef.current = window.setTimeout(advance, ADVANCE_MS);
    },
    [cards, index, advance]
  );

  const card = cards[index];

  if (loading) {
    return <p className="text-slate-500">Loading drills…</p>;
  }

  if (!card) {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <h2 className="text-3xl font-bold tracking-tight">Drills</h2>
        <PracticeVsDrills active="drill" />
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-10 text-center">
          <p style={{ color: "var(--text-primary)" }}>No drills due right now.</p>
          <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
            Drills are generated from your weak bigrams. Do a few Practice rounds
            (or let passive capture build a profile), then come back.
          </p>
          <button
            onClick={load}
            className="mt-6 rounded-xl px-5 py-2.5 text-sm font-semibold transition hover:opacity-90"
            style={{ background: "var(--accent)", color: "var(--bg-base)" }}
          >
            Generate from profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-8 flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Drills</h2>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            Flashcard-style review: each card hammers one specific weak pair,
            and how well you type it decides when that pair comes back. We grade
            every run automatically — just type.
          </p>
        </div>
        <div className="text-right text-xs" style={{ color: "var(--text-muted)" }}>
          <p>
            Card {index + 1} / {cards.length}
          </p>
          <p className="mt-1">
            focus{" "}
            <span className="rounded-md px-2 py-0.5 font-mono" style={{ background: "var(--accent-bg)", color: "var(--accent)" }}>
              {card.target_keys}
            </span>
          </p>
        </div>
      </header>

      <PracticeVsDrills active="drill" />

      <TypingTest
        key={`${index}-${card.id}`}
        text={card.prompt}
        onComplete={onComplete}
        label={`Drill — ${card.target_keys}`}
      />

      <div className="mt-6 h-24">
        {stats && (
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
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                Scheduled
              </p>
              <p className="mt-1 text-sm" style={{ color: "var(--accent)" }}>
                {gradeLabel(qualityFromPerformance(stats.accuracy, stats.errors))}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function gradeLabel(quality: number): string {
  if (quality >= 5) return "Mastered — long interval";
  if (quality >= 4) return "Great — pushed out";
  if (quality >= 3) return "Good — review soon";
  if (quality >= 1) return "Shaky — repeat tomorrow";
  return "Needs work — repeat";
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
      <p className="text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{label}</p>
      <p
        className="mt-1 text-2xl font-bold tabular-nums"
        style={{ color: accent ? "var(--accent)" : danger ? "var(--char-error)" : "var(--text-primary)" }}
      >
        {value}
      </p>
    </div>
  );
}
