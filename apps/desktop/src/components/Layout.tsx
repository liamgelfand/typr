import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { api } from "../api";
import type { CaptureStatus } from "../types";

const nav = [
  { to: "/", label: "Dashboard", icon: IconGrid },
  { to: "/practice", label: "Practice", icon: IconKeyboard },
  { to: "/drills", label: "Drills", icon: IconTarget },
  { to: "/settings", label: "Settings", icon: IconGear },
];

export function Layout() {
  const [capture, setCapture] = useState<CaptureStatus | null>(null);

  useEffect(() => {
    const tick = () => api.getCaptureStatus().then(setCapture).catch(() => {});
    tick();
    const id = setInterval(tick, 4000);
    return () => clearInterval(id);
  }, []);

  async function togglePause() {
    if (!capture?.running) return;
    setCapture(await api.togglePause());
  }

  const status = !capture?.running
    ? { dot: "bg-slate-500", text: "Capture off", tone: "text-slate-400" }
    : capture.paused
      ? { dot: "bg-amber-400", text: "Paused", tone: "text-amber-300" }
      : { dot: "bg-emerald-400 animate-pulse", text: "Recording", tone: "text-emerald-300" };

  return (
    <div className="flex h-screen text-slate-200">
      <aside className="flex w-60 flex-col border-r border-white/5 bg-slate-950/40 px-4 py-6 backdrop-blur">
        <div className="mb-8 flex items-center gap-2.5 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 font-bold text-white shadow-lg shadow-indigo-500/30">
            T
          </div>
          <span className="text-lg font-semibold tracking-tight">Typr</span>
        </div>

        <nav className="flex flex-col gap-1">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-white/10 text-white shadow-sm"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                }`
              }
            >
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>

        <button
          onClick={togglePause}
          disabled={!capture?.running}
          title={capture?.running ? "Toggle capture pause" : "Capture is off"}
          className="mt-auto flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-3 py-2.5 text-left text-xs transition hover:bg-white/10 disabled:cursor-default disabled:hover:bg-white/5"
        >
          <span className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${status.dot}`} />
            <span className={status.tone}>{status.text}</span>
          </span>
          {capture?.running && (
            <span className="text-slate-500">
              {capture.paused ? "Resume" : "Pause"}
            </span>
          )}
        </button>
      </aside>

      <main className="flex-1 overflow-auto px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}

function IconGrid() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}
function IconKeyboard() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8" />
    </svg>
  );
}
function IconTarget() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </svg>
  );
}
function IconGear() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
