import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface TypingMiss {
  prev: string | null;
  expected: string;
  typed: string;
  /** Index in the target text where the miss happened (for review highlighting). */
  index: number;
}

export interface TypingRunResult {
  durationMs: number;
  keystrokes: number;
  errors: number;
  misses: TypingMiss[];
  wpm: number;
  accuracy: number;
}

interface Props {
  text: string;
  onComplete: (result: TypingRunResult) => void;
  /** Shown above the typing area, e.g. "Focus: th". */
  label?: string;
}

/**
 * keybr-style typing surface: validates every keystroke as it happens. A wrong
 * key turns the current letter red, counts as an error, and does NOT advance —
 * you must press the correct key to move on (backspace is ignored). Focus stays
 * on the box the whole time so you never have to click again mid-line.
 */
export function TypingTest({ text, onComplete, label }: Props) {
  const chars = useMemo(() => Array.from(text), [text]);

  const [pos, setPos] = useState(0);
  const [wrong, setWrong] = useState(false);
  const [liveErrors, setLiveErrors] = useState(0);
  const [focused, setFocused] = useState(false);

  const startRef = useRef<number | null>(null);
  const keystrokesRef = useRef(0);
  const missesRef = useRef<TypingMiss[]>([]);
  const doneRef = useRef(false);
  const surfaceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPos(0);
    setWrong(false);
    setLiveErrors(0);
    startRef.current = null;
    keystrokesRef.current = 0;
    missesRef.current = [];
    doneRef.current = false;
    surfaceRef.current?.focus();
  }, [text]);

  /** Replay the shake CSS without remounting the surface (remounting drops focus). */
  const playShake = useCallback(() => {
    const el = surfaceRef.current;
    if (!el) return;
    el.classList.remove("animate-shake");
    void el.offsetWidth;
    el.classList.add("animate-shake");
  }, []);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    const durationMs = startRef.current ? performance.now() - startRef.current : 0;
    const minutes = durationMs / 60000;
    const wpm = minutes > 0 ? Math.round(chars.length / 5 / minutes) : 0;
    const ks = keystrokesRef.current;
    const errs = missesRef.current.length;
    const accuracy = ks > 0 ? Math.max(0, ((ks - errs) / ks) * 100) : 100;
    onComplete({
      durationMs,
      keystrokes: ks,
      errors: errs,
      misses: missesRef.current,
      wpm,
      accuracy,
    });
  }, [chars.length, onComplete]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (doneRef.current) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key;
      if (key === "Backspace") {
        e.preventDefault();
        return;
      }
      if (key.length !== 1) return;
      e.preventDefault();

      if (startRef.current === null) startRef.current = performance.now();
      keystrokesRef.current += 1;

      const expected = chars[pos];
      if (key === expected) {
        const next = pos + 1;
        setWrong(false);
        setPos(next);
        if (next >= chars.length) finish();
      } else {
        missesRef.current.push({
          prev: pos > 0 ? chars[pos - 1] : null,
          expected,
          typed: key,
          index: pos,
        });
        setLiveErrors((n) => n + 1);
        setWrong(true);
        playShake();
      }
    },
    [chars, pos, finish, playShake]
  );

  const progress = chars.length > 0 ? Math.round((pos / chars.length) * 100) : 0;
  const liveWpm = (() => {
    if (!startRef.current || pos === 0) return 0;
    const minutes = (performance.now() - startRef.current) / 60000;
    return minutes > 0 ? Math.round(pos / 5 / minutes) : 0;
  })();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs" style={{ color: "var(--text-muted)" }}>
        <span className="font-medium uppercase tracking-wider">
          {label ?? "Type the text below"}
        </span>
        <div className="flex items-center gap-4 font-mono">
          <span>
            <span style={{ color: "var(--text-primary)" }}>{liveWpm}</span> wpm
          </span>
          <span>
            <span style={{ color: liveErrors > 0 ? "var(--char-error)" : "var(--text-primary)" }}>
              {liveErrors}
            </span>{" "}
            err
          </span>
        </div>
      </div>

      <div
        ref={surfaceRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={`typing-surface relative rounded-2xl border p-7 text-2xl backdrop-blur transition ${
          wrong ? "border-rose-500/40" : ""
        } ${focused ? "ring-2" : ""}`}
        style={{
          borderColor: wrong ? undefined : "var(--border)",
          background: "var(--bg-elevated)",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          ...(focused
            ? {
                outlineColor: "var(--accent-border)",
                boxShadow: "0 0 0 2px var(--accent-border)",
              }
            : {}),
        }}
      >
        {chars.map((ch, i) => {
          let cls = "typing-char ";
          if (i < pos) cls += "typing-char--done";
          else if (i === pos) cls += `typing-char--active ${wrong ? "is-wrong typing-char--error" : "typing-char--pending"}`;
          else cls += "typing-char--pending";
          return (
            <span key={i} className={cls}>
              {ch}
            </span>
          );
        })}

        {!focused && (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl backdrop-blur-sm text-sm" style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", opacity: 0.92 }}>
            Click here and start typing
          </div>
        )}
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--bg-subtle)" }}>
        <div
          className="h-full rounded-full transition-[width] duration-150"
          style={{ width: `${progress}%`, background: "var(--accent)" }}
        />
      </div>
    </div>
  );
}
