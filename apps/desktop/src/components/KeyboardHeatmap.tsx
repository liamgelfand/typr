const ROWS = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"],
];

interface Props {
  /** char -> error rate 0..1 */
  errorByChar: Record<string, number>;
}

export function KeyboardHeatmap({ errorByChar }: Props) {
  const maxRate = Math.max(0.01, ...Object.values(errorByChar));

  function charRate(c: string): number {
    let max = 0;
    for (const [bg, rate] of Object.entries(errorByChar)) {
      if (bg.includes(c)) max = Math.max(max, rate);
    }
    return max;
  }

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
            const rate = charRate(key);
            return (
              <div
                key={key}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-medium transition"
                style={heatStyle(rate)}
                title={`${key.toUpperCase()} · ${(rate * 100).toFixed(0)}% error signal`}
              >
                {key}
              </div>
            );
          })}
        </div>
      ))}
      <p className="mt-3 text-xs text-slate-500">
        Warmer keys appear in more of your mistyped bigrams
      </p>
    </div>
  );
}
