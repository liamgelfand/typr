import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api";
import { KeyboardHeatmap } from "../components/KeyboardHeatmap";
import type { CaptureStatus, ErrorProfile, SessionSummary } from "../types";

export function Dashboard() {
  const [capture, setCapture] = useState<CaptureStatus | null>(null);
  const [profile, setProfile] = useState<ErrorProfile | null>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [eventCount, setEventCount] = useState(0);

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  async function load() {
    setCapture(await api.getCaptureStatus());
    setProfile(await api.getErrorProfile());
    setSessions(await api.getSessions());
    setEventCount(await api.getEventCount());
  }

  const slowData =
    profile?.slow_bigrams
      .filter((b) => b.delay_p50_ms != null)
      .slice(0, 12)
      .map((b) => ({ bigram: b.bigram, ms: Math.round(b.delay_p50_ms ?? 0) })) ??
    [];

  const sessionChart = sessions
    .slice(0, 14)
    .reverse()
    .map((s) => ({
      label: new Date(s.started_at * 1000).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      events: s.event_count,
    }));

  const captureLabel = !capture?.running
    ? "Off"
    : capture.paused
      ? "Paused"
      : "Recording";

  const practiceCount = sessions.filter(
    (s) => s.session_type === "practice" || s.session_type === "drill"
  ).length;

  return (
    <div className="space-y-7">
      <header>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="mt-1 text-sm text-slate-400">
          Your typing profile, built locally from passive capture and practice.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Keystrokes logged" value={eventCount.toLocaleString()} />
        <Kpi label="Capture" value={captureLabel} tone={capture?.running && !capture.paused ? "good" : "muted"} />
        <Kpi label="Weak bigrams" value={(profile?.weak_bigrams.length ?? 0).toString()} />
        <Kpi label="Sessions" value={practiceCount.toString()} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card
          title="Error heatmap"
          hint="Each key is shaded by how often it shows up in the letter-pairs you mistype. Hover any key to see its miss rate and the exact pairs behind it."
        >
          <KeyboardHeatmap bigrams={profile?.weak_bigrams ?? []} />
        </Card>

        <Card title="Slowest bigrams (p50 delay)">
          {slowData.length === 0 ? (
            <Empty>
              Timing builds up as you type. Slow bigrams appear once passive
              capture has some history.
            </Empty>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={slowData}>
                <XAxis dataKey="bigram" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  contentStyle={{
                    background: "#0f1320",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 12,
                  }}
                />
                <Bar dataKey="ms" fill="#34d399" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <Card
        title="Weak letter-pairs (bigrams)"
        hint="A bigram is just two letters typed back-to-back, like “th” or “er”. These are the pairs you miss most: the percentage is how often you mistype the pair, and “N of M” is misses out of total attempts. Lower is better."
      >
        {profile?.weak_bigrams.length ? (
          <>
            <p className="mb-3 text-xs text-slate-500">
              Pairs you get wrong most often. “th — 12% · 3 of 25” means: when
              the pair <span className="font-mono text-slate-400">th</span> came
              up 25 times, you mistyped it 3 times (12%).
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {profile.weak_bigrams.map((w) => (
                <div
                  key={w.bigram}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-3 py-2.5 text-sm"
                >
                  <span className="font-mono text-base text-indigo-300">
                    {w.bigram}
                  </span>
                  <span className="text-right">
                    <span className="block font-semibold text-rose-300">
                      {(w.error_rate * 100).toFixed(0)}% missed
                    </span>
                    <span className="block text-xs text-slate-500">
                      {w.error_count} of {w.attempt_count} tries
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <Empty>
            No error patterns yet — type for a while, or run a few Practice
            rounds to seed your profile.
          </Empty>
        )}
      </Card>

      <Card
        title="Keystrokes captured per day"
        hint="An “event” is a single keystroke recorded by passive capture in the background. This chart sums those keystrokes by day. Practice and drill rounds are graded live and don’t add to this count — see the session log below for those."
      >
        {sessionChart.length === 0 ? (
          <Empty>No sessions recorded yet.</Empty>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={sessionChart}>
              <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
                formatter={(v: number) => [v.toLocaleString(), "keystrokes"]}
                contentStyle={{
                  background: "#0f1320",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                }}
              />
              <Bar dataKey="events" fill="#818cf8" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card
        title="Session log"
        hint="Every recording or practice session, newest first. Passive sessions count keystrokes captured in the background; Practice and Drill rows show how long the round took."
      >
        {sessions.length === 0 ? (
          <Empty>No sessions yet.</Empty>
        ) : (
          <div className="divide-y divide-white/5">
            {sessions.slice(0, 12).map((s) => (
              <SessionRow key={s.id} session={s} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function SessionRow({ session }: { session: SessionSummary }) {
  const start = new Date(session.started_at * 1000);
  const durationMs =
    session.ended_at != null ? (session.ended_at - session.started_at) * 1000 : null;

  const type = sessionTypeMeta(session.session_type);

  return (
    <div className="flex items-center justify-between py-2.5 text-sm">
      <div className="flex items-center gap-3">
        <span
          className={`rounded-md px-2 py-0.5 text-xs font-medium ${type.className}`}
        >
          {type.label}
        </span>
        <span className="text-slate-400">
          {start.toLocaleDateString(undefined, { month: "short", day: "numeric" })}{" "}
          {start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
        </span>
      </div>
      <div className="text-right text-xs text-slate-500">
        {session.session_type === "passive" ? (
          <span>{session.event_count.toLocaleString()} keystrokes</span>
        ) : (
          <span>{formatDuration(durationMs)}</span>
        )}
      </div>
    </div>
  );
}

function sessionTypeMeta(type: string): { label: string; className: string } {
  switch (type) {
    case "practice":
      return { label: "Practice", className: "bg-indigo-500/15 text-indigo-300" };
    case "drill":
      return { label: "Drill", className: "bg-violet-500/15 text-violet-300" };
    default:
      return { label: "Passive", className: "bg-emerald-500/15 text-emerald-300" };
  }
}

function formatDuration(ms: number | null): string {
  if (ms == null || ms <= 0) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "muted";
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
      <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
      <p
        className={`mt-2 text-2xl font-bold tabular-nums ${
          tone === "good" ? "text-emerald-300" : "text-slate-100"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Card({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-5">
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-slate-300">{title}</h3>
        {hint && <InfoDot text={hint} />}
      </div>
      {children}
    </section>
  );
}

function InfoDot({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex">
      <span className="flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-white/20 text-[10px] font-bold text-slate-400 transition group-hover:border-indigo-400/60 group-hover:text-indigo-300">
        i
      </span>
      <span className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 w-64 -translate-x-1/2 rounded-xl border border-white/10 bg-slate-950/95 p-3 text-xs leading-relaxed text-slate-300 opacity-0 shadow-2xl backdrop-blur transition-opacity duration-150 group-hover:opacity-100">
        {text}
      </span>
    </span>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-500">{children}</p>;
}
