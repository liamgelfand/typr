interface Props {
  active: "practice" | "drill";
}

/**
 * Compact side-by-side explainer so the two modes never get confused. The
 * mode you're currently on is highlighted.
 */
export function PracticeVsDrills({ active }: Props) {
  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-2">
      <Tile
        on={active === "practice"}
        title="Practice"
        tagline="Open-ended warm-up"
        points={[
          "Endless fresh lines of real words",
          "Weighted toward your weak pairs overall",
          "Type whenever — nothing is scheduled",
        ]}
      />
      <Tile
        on={active === "drill"}
        title="Drills"
        tagline="Spaced repetition, one pair at a time"
        points={[
          "Each card targets a single weak bigram",
          "Reviews are scheduled like flashcards (SM-2)",
          "Nail it → comes back later; miss it → sooner",
        ]}
      />
    </div>
  );
}

function Tile({
  on,
  title,
  tagline,
  points,
}: {
  on: boolean;
  title: string;
  tagline: string;
  points: string[];
}) {
  return (
    <div
      className={`rounded-2xl border p-4 transition ${
        on
          ? "border-indigo-400/40 bg-indigo-500/10"
          : "border-white/10 bg-slate-900/40"
      }`}
    >
      <div className="flex items-center gap-2">
        <h3
          className={`text-sm font-semibold ${on ? "text-indigo-200" : "text-slate-300"}`}
        >
          {title}
        </h3>
        {on && (
          <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-indigo-300">
            you’re here
          </span>
        )}
      </div>
      <p className="mt-0.5 text-xs text-slate-500">{tagline}</p>
      <ul className="mt-2 space-y-1">
        {points.map((p) => (
          <li key={p} className="flex gap-2 text-xs text-slate-400">
            <span className={on ? "text-indigo-400" : "text-slate-600"}>•</span>
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}
