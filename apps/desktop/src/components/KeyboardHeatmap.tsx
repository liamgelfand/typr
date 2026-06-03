import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { WeakBigram } from "../types";

const ROWS = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  ["z", "x", "c", "v", "b", "n", "m"],
];

const TOOLTIP_GAP = 8;

interface Props {
  bigrams: WeakBigram[];
}

interface KeyData {
  peakRate: number;
  errors: number;
  attempts: number;
  pairs: WeakBigram[];
}

interface HoverState {
  char: string;
  data?: KeyData;
  placement: "above" | "below";
  anchor: DOMRect;
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

  const [hover, setHover] = useState<HoverState | null>(null);
  const anchorRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const syncHoverRect = useCallback(() => {
    setHover((prev) => {
      if (!prev) return null;
      const el = anchorRefs.current[prev.char];
      if (!el) return null;
      return { ...prev, anchor: el.getBoundingClientRect() };
    });
  }, []);

  useEffect(() => {
    if (!hover) return;
    window.addEventListener("scroll", syncHoverRect, true);
    window.addEventListener("resize", syncHoverRect);
    return () => {
      window.removeEventListener("scroll", syncHoverRect, true);
      window.removeEventListener("resize", syncHoverRect);
    };
  }, [hover, syncHoverRect]);

  function heatStyle(rate: number): React.CSSProperties {
    const t = Math.min(1, rate / maxRate);
    if (rate === 0) {
      return {
        background: "var(--heatmap-key-bg)",
        color: "var(--heatmap-key-text)",
      };
    }
    return {
      background: `rgba(244, 63, 94, ${0.12 + t * 0.6})`,
      color:
        t > 0.45
          ? "var(--heatmap-key-text-hot)"
          : "var(--heatmap-key-text-warm)",
      boxShadow: t > 0.6 ? "0 0 18px rgba(244,63,94,0.35)" : undefined,
    };
  }

  function showTooltip(char: string, rowIndex: number) {
    const el = anchorRefs.current[char];
    if (!el) return;
    setHover({
      char,
      data: byChar[char],
      placement: rowIndex === 0 ? "below" : "above",
      anchor: el.getBoundingClientRect(),
    });
  }

  return (
    <div className="w-full">
      <div className="overflow-x-auto">
        <div className="flex flex-col items-center gap-1.5 min-w-fit mx-auto px-2 py-2">
          {ROWS.map((row, ri) => (
            <div key={ri} className="flex gap-1.5" style={{ paddingLeft: ri * 16 }}>
              {row.map((key) => {
                const data = byChar[key];
                const rate = data?.peakRate ?? 0;
                return (
                  <div
                    key={key}
                    ref={(el) => {
                      anchorRefs.current[key] = el;
                    }}
                    className="relative"
                    onMouseEnter={() => showTooltip(key, ri)}
                    onMouseLeave={() =>
                      setHover((h) => (h?.char === key ? null : h))
                    }
                  >
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg text-sm font-medium transition"
                      style={heatStyle(rate)}
                    >
                      {key}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <p className="mt-3 text-center text-xs" style={{ color: "var(--text-muted)" }}>
        Warmer keys show up in more of your mistyped letter-pairs. Hover a key
        for the breakdown.
      </p>
      {hover &&
        createPortal(
          <KeyTooltip
            char={hover.char}
            data={hover.data}
            placement={hover.placement}
            anchor={hover.anchor}
          />,
          document.body
        )}
    </div>
  );
}

function KeyTooltip({
  char,
  data,
  placement,
  anchor,
}: {
  char: string;
  data?: KeyData;
  placement: "above" | "below";
  anchor: DOMRect;
}) {
  const below = placement === "below";
  const centerX = anchor.left + anchor.width / 2;
  const top = below ? anchor.bottom + TOOLTIP_GAP : anchor.top - TOOLTIP_GAP;
  const transform = below ? "translate(-50%, 0)" : "translate(-50%, -100%)";

  return (
    <div
      className="pointer-events-none fixed z-[9999] w-56 rounded-xl border p-3 text-left shadow-lg backdrop-blur"
      style={{
        left: centerX,
        top,
        transform,
        borderColor: "var(--border)",
        background: "var(--bg-elevated)",
      }}
    >
      <div className="flex items-baseline justify-between">
        <span
          className="font-mono text-base font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          {char.toUpperCase()}
        </span>
        {data ? (
          <span className="text-xs" style={{ color: "var(--char-error)" }}>
            {(data.peakRate * 100).toFixed(0)}% peak miss
          </span>
        ) : (
          <span className="text-xs" style={{ color: "var(--accent)" }}>
            clean
          </span>
        )}
      </div>
      {data ? (
        <>
          <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
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
                <span className="font-mono" style={{ color: "var(--accent)" }}>
                  {p.bigram}
                </span>
                <span style={{ color: "var(--text-muted)" }}>
                  {(p.error_rate * 100).toFixed(0)}% · {p.error_count}/
                  {p.attempt_count}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
          No mistyped pairs involve this key yet. Keep typing.
        </p>
      )}
      <span
        className={`absolute left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 ${
          below
            ? "bottom-full translate-y-1 border-l border-t"
            : "top-full -translate-y-1 border-b border-r"
        }`}
        style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}
      />
    </div>
  );
}
