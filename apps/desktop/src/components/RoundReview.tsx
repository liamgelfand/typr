import type { TypingMiss } from "./TypingTest";

interface Props {
  text: string;
  misses: TypingMiss[];
}

/**
 * Shows the line the user just typed with the exact spots they missed
 * highlighted, plus a plain-language list of what they typed instead. This is
 * the "prove it" view: concrete evidence of where the errors actually were.
 */
export function RoundReview({ text, misses }: Props) {
  const chars = Array.from(text);
  const missByIndex = new Map<number, TypingMiss[]>();
  for (const m of misses) {
    if (m.index == null) continue;
    const list = missByIndex.get(m.index) ?? [];
    list.push(m);
    missByIndex.set(m.index, list);
  }

  return (
    <div
      className="animate-fade-in-up space-y-4 rounded-2xl border p-5"
      style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          Where you went wrong
        </h3>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {misses.length === 0
            ? "Clean run — no misses"
            : `${misses.length} miss${misses.length === 1 ? "" : "es"}`}
        </span>
      </div>

      <p
        className="font-mono text-lg leading-relaxed"
        style={{ wordBreak: "break-word" }}
      >
        {chars.map((ch, i) => {
          const missed = missByIndex.has(i);
          return (
            <span
              key={i}
              className={
                missed
                  ? "rounded underline decoration-2 underline-offset-4"
                  : ""
              }
              style={missed
                ? { background: "var(--char-error-bg)", color: "var(--char-error)", textDecorationColor: "var(--char-error)" }
                : { color: "var(--text-secondary)" }
              }
              title={
                missed
                  ? `You typed “${missByIndex
                      .get(i)!
                      .map((m) => m.typed)
                      .join("”, “")}” instead of “${ch}”`
                  : undefined
              }
            >
              {ch}
            </span>
          );
        })}
      </p>

      {misses.length > 0 && (
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {misses.map((m, i) => (
            <li
              key={i}
              className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs"
              style={{ borderColor: "var(--border)", background: "var(--bg-subtle)" }}
            >
              <span style={{ color: "var(--text-muted)" }}>wanted</span>
              <span className="font-mono" style={{ color: "var(--accent)" }}>
                {display(m.expected)}
              </span>
              <span style={{ color: "var(--text-muted)" }}>· typed</span>
              <span className="font-mono" style={{ color: "var(--char-error)" }}>{display(m.typed)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function display(ch: string): string {
  if (ch === " ") return "space";
  return ch;
}
