import { useEffect, useState } from "react";
import { api } from "../api";
import type { CaptureStatus } from "../types";

export function Settings() {
  const [capture, setCapture] = useState<CaptureStatus | null>(null);
  const [blocklist, setBlocklist] = useState<string[]>([]);
  const [newPattern, setNewPattern] = useState("");
  const [exportJson, setExportJson] = useState<string | null>(null);

  useEffect(() => {
    api.getCaptureStatus().then(setCapture);
    api.getBlocklist().then(setBlocklist);
  }, []);

  async function toggleCapture() {
    if (capture?.running) {
      setCapture(await api.stopCapture());
    } else {
      setCapture(await api.startCapture());
    }
  }

  async function addPattern() {
    if (!newPattern.trim()) return;
    await api.addBlocklist(newPattern.trim());
    setBlocklist(await api.getBlocklist());
    setNewPattern("");
  }

  async function removePattern(p: string) {
    await api.removeBlocklist(p);
    setBlocklist(await api.getBlocklist());
  }

  async function handleExport() {
    setExportJson(await api.exportData());
  }

  async function handleDelete() {
    if (confirm("Delete all local Typr data? This cannot be undone.")) {
      await api.deleteAllData();
      setExportJson(null);
      setBlocklist(await api.getBlocklist());
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="mt-1 text-sm text-slate-400">
          Everything stays on this device.
        </p>
      </header>

      <Section title="Passive capture">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">
            Typr learns from your everyday typing in the background. Turn it off
            anytime — practice and drills still work.
          </p>
          <Toggle on={!!capture?.running} onClick={toggleCapture} />
        </div>
        {capture?.running && (
          <p className="mt-3 text-xs text-emerald-300">
            {capture.paused
              ? "Capture is paused."
              : "Recording. Pause quickly with the sidebar control or your global hotkey (Ctrl/Cmd+Shift+P)."}
          </p>
        )}
      </Section>

      <Section title="App blocklist">
        <p className="mb-3 text-sm text-slate-400">
          Windows whose title contains any of these terms are never recorded.
        </p>
        <ul className="space-y-1.5">
          {blocklist.map((p) => (
            <li
              key={p}
              className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-sm"
            >
              <span className="font-mono text-slate-300">{p}</span>
              <button
                onClick={() => removePattern(p)}
                className="text-xs text-rose-400 transition hover:text-rose-300"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex gap-2">
          <input
            value={newPattern}
            onChange={(e) => setNewPattern(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addPattern()}
            placeholder="e.g. Incognito"
            className="flex-1 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm outline-none transition focus:border-indigo-500/60"
          />
          <button
            onClick={addPattern}
            className="rounded-xl bg-white/10 px-4 py-2 text-sm font-medium transition hover:bg-white/15"
          >
            Add
          </button>
        </div>
      </Section>

      <Section title="Your data">
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm transition hover:bg-white/5"
          >
            Export JSON
          </button>
          <button
            onClick={handleDelete}
            className="rounded-xl border border-rose-500/30 px-4 py-2 text-sm text-rose-400 transition hover:bg-rose-500/10"
          >
            Delete all data
          </button>
        </div>
        {exportJson && (
          <pre className="mt-3 max-h-48 overflow-auto rounded-xl bg-slate-950/70 p-3 text-xs text-slate-400">
            {exportJson}
          </pre>
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-5">
      <h3 className="mb-3 text-sm font-semibold text-slate-300">{title}</h3>
      {children}
    </section>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      role="switch"
      aria-checked={on}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${
        on ? "bg-emerald-500" : "bg-slate-600"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
          on ? "left-[22px]" : "left-0.5"
        }`}
      />
    </button>
  );
}
