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
    <div className="animate-fade-in-up space-y-4 rounded-2xl border border-white/10 bg-slate-900/60 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-300">
          Where you went wrong
        </h3>
        <span className="text-xs text-slate-500">
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
                  ? "rounded bg-rose-500/20 text-rose-300 underline decoration-rose-400 decoration-2 underline-offset-4"
                  : "text-slate-400"
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
              className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/5 px-3 py-1.5 text-xs"
            >
              <span className="text-slate-500">wanted</span>
              <span className="font-mono text-emerald-300">
                {display(m.expected)}
              </span>
              <span className="text-slate-500">· typed</span>
              <span className="font-mono text-rose-300">{display(m.typed)}</span>
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
