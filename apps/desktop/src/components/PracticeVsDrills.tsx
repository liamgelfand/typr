interface Props {
  active: "practice" | "drill";
}

const MODES = {
  practice: {
    title: "Practice",
    tagline: "Open-ended warm-up",
    points: [
      "Endless fresh lines of real words",
      "Weighted toward your weak pairs overall",
      "Type whenever — nothing is scheduled",
    ],
  },
  drill: {
    title: "Drills",
    tagline: "Spaced repetition, one pair at a time",
    points: [
      "Each card targets a single weak bigram",
      "Reviews are scheduled like flashcards (SM-2)",
      "Nail it → comes back later; miss it → sooner",
    ],
  },
} as const;

export function PracticeVsDrills({ active }: Props) {
  const mode = MODES[active];
  return (
    <div
      className="mb-6 rounded-2xl border p-4"
      style={{
        borderColor: "var(--accent-border)",
        background: "var(--accent-bg)",
      }}
    >
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold" style={{ color: "var(--accent)" }}>
          {mode.title}
        </h3>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider"
          style={{ background: "var(--accent-bg)", color: "var(--text-secondary)" }}
        >
          {mode.tagline}
        </span>
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-0.5">
        {mode.points.map((p) => (
          <li key={p} className="flex gap-1.5 text-xs" style={{ color: "var(--text-secondary)" }}>
            <span style={{ color: "var(--accent)" }}>•</span>
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}
