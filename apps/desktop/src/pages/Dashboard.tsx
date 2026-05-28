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

  const errorByChar: Record<string, number> = {};
  profile?.weak_bigrams.forEach((w) => {
    for (const c of w.bigram) {
      errorByChar[c] = Math.max(errorByChar[c] ?? 0, w.error_rate);
    }
  });

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
        <Card title="Error heatmap">
          <KeyboardHeatmap errorByChar={errorByChar} />
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

      <Card title="Weak bigrams">
        {profile?.weak_bigrams.length ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {profile.weak_bigrams.map((w) => (
              <div
                key={w.bigram}
                className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-3 py-2.5 text-sm"
              >
                <span className="font-mono text-indigo-300">{w.bigram}</span>
                <span className="text-slate-400">
                  {(w.error_rate * 100).toFixed(0)}% · {w.error_count}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <Empty>
            No error patterns yet — type for a while, or run a few Practice
            rounds to seed your profile.
          </Empty>
        )}
      </Card>

      <Card title="Session activity">
        {sessionChart.length === 0 ? (
          <Empty>No sessions recorded yet.</Empty>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={sessionChart}>
              <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
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
    </div>
  );
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

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-5">
      <h3 className="mb-4 text-sm font-semibold text-slate-300">{title}</h3>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-500">{children}</p>;
}
