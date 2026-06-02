import { useMemo, useState } from "react";
import type { WeakBigram } from "../types";

const ROWS = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"],
];

interface Props {
  bigrams: WeakBigram[];
}

interface KeyData {
  /** Peak error rate (0..1) across pairs that include this key. */
  peakRate: number;
  errors: number;
  attempts: number;
  /** Pairs that include this key, worst first. */
  pairs: WeakBigram[];
}

export function KeyboardHeatmap({ bigrams }: Props) {
  const byChar = useMemo(() => {
    const map: Record<string, KeyData> = {};
    for (const b of bigrams) {
      for (const c of new Set(b.bigram.toLowerCase())) {
        const d =
          map[c] ?? (map[c] = { peakRate: 0, errors: 0, attempts: 0, pairs: [] });
        d.peakRate = Math.max(d.peakRate, b.error_rate);
        d.errors += b.error_count;
        d.attempts += b.attempt_count;
        d.pairs.push(b);
      }
    }
    for (const d of Object.values(map)) {
      d.pairs.sort((a, b) => b.error_rate - a.error_rate);
    }
    return map;
  }, [bigrams]);

  const maxRate = Math.max(
    0.01,
    ...Object.values(byChar).map((d) => d.peakRate)
  );

  const [hovered, setHovered] = useState<string | null>(null);

  // Interpolate from a calm slate (no errors) to a hot rose (high error rate).
  function heatStyle(rate: number): React.CSSProperties {
    const t = Math.min(1, rate / maxRate);
    if (rate === 0) {
      return { background: "rgba(255,255,255,0.04)", color: "#64748b" };
    }
    return {
      background: `rgba(244, 63, 94, ${0.12 + t * 0.6})`,
      color: t > 0.45 ? "#fff" : "#cbd5e1",
      boxShadow: t > 0.6 ? "0 0 18px rgba(244,63,94,0.35)" : undefined,
    };
  }

  return (
    <div className="flex flex-col items-center gap-1.5 py-2">
      {ROWS.map((row, ri) => (
        <div key={ri} className="flex gap-1.5" style={{ paddingLeft: ri * 16 }}>
          {row.map((key) => {
            const data = byChar[key];
            const rate = data?.peakRate ?? 0;
            return (
              <div key={key} className="relative">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-medium transition"
                  style={heatStyle(rate)}
                  onMouseEnter={() => setHovered(key)}
                  onMouseLeave={() => setHovered((h) => (h === key ? null : h))}
                >
                  {key}
                </div>
                {hovered === key && (
                  <KeyTooltip char={key} data={data} />
                )}
              </div>
            );
          })}
        </div>
      ))}
      <p className="mt-3 text-center text-xs text-slate-500">
        Warmer keys show up in more of your mistyped letter-pairs. Hover a key
        for the breakdown.
      </p>
    </div>
  );
}

function KeyTooltip({ char, data }: { char: string; data?: KeyData }) {
  return (
    <div className="absolute bottom-full left-1/2 z-20 mb-2 w-56 -translate-x-1/2 rounded-xl border border-white/10 bg-slate-950/95 p-3 text-left shadow-2xl backdrop-blur">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-base font-semibold text-slate-100">
          {char.toUpperCase()}
        </span>
        {data ? (
          <span className="text-xs text-rose-300">
            {(data.peakRate * 100).toFixed(0)}% peak miss
          </span>
        ) : (
          <span className="text-xs text-emerald-300">clean</span>
        )}
      </div>
      {data ? (
        <>
          <p className="mt-1 text-xs text-slate-400">
            {data.errors} miss{data.errors === 1 ? "" : "es"} across{" "}
            {data.attempts} attempt{data.attempts === 1 ? "" : "s"} in pairs
            using “{char}”.
          </p>
          <ul className="mt-2 space-y-1">
            {data.pairs.slice(0, 4).map((p) => (
              <li
                key={p.bigram}
                className="flex items-center justify-between text-xs"
              >
                <span className="font-mono text-indigo-300">{p.bigram}</span>
                <span className="text-slate-400">
                  {(p.error_rate * 100).toFixed(0)}% · {p.error_count}/
                  {p.attempt_count}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-1 text-xs text-slate-400">
          No mistyped pairs involve this key yet. Keep typing.
        </p>
      )}
      <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1 rotate-45 border-b border-r border-white/10 bg-slate-950/95" />
    </div>
  );
}
