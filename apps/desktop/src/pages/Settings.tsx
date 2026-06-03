import { useEffect, useState } from "react";
import { api } from "../api";
import { useTheme } from "../ThemeContext";
import type { CaptureStatus } from "../types";

export function Settings() {
  const { theme, toggle: toggleTheme } = useTheme();
  const [capture, setCapture] = useState<CaptureStatus | null>(null);
  const [blocklist, setBlocklist] = useState<string[]>([]);
  const [newPattern, setNewPattern] = useState("");
  const [exportJson, setExportJson] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

  async function handlePreview() {
    setExportJson(exportJson ? null : await api.exportData());
  }

  async function handleCopy() {
    const json = await api.exportData();
    try {
      await navigator.clipboard.writeText(json);
    } catch {
      // Fallback for webviews that block the async clipboard API.
      const ta = document.createElement("textarea");
      ta.value = json;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDownload() {
    const json = await api.exportData();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `typr-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Everything stays on this device.
        </p>
      </header>

      <Section title="Appearance">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Theme</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
              {theme === "dark" ? "Dark mode" : "Light mode"}
            </p>
          </div>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium transition hover:bg-white/10"
          >
            {theme === "dark" ? (
              <>
                <IconSun /> Switch to light
              </>
            ) : (
              <>
                <IconMoon /> Switch to dark
              </>
            )}
          </button>
        </div>
      </Section>

      <Section title="Passive capture">
        <div className="flex items-center justify-between">
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Typr learns from your everyday typing in the background. Turn it off
            anytime — practice and drills still work.
          </p>
          <Toggle on={!!capture?.running} onClick={toggleCapture} />
        </div>
        {capture?.running && (
          <p className="mt-3 text-xs" style={{ color: "var(--accent)" }}>
            {capture.paused
              ? "Capture is paused."
              : "Recording. Pause quickly with the sidebar control or your global hotkey (Ctrl/Cmd+Shift+P)."}
          </p>
        )}
      </Section>

      <Section title="App blocklist">
        <p className="mb-3 text-sm" style={{ color: "var(--text-secondary)" }}>
          Windows whose title contains any of these terms are never recorded.
        </p>
        <ul className="space-y-1.5">
          {blocklist.map((p) => (
            <li
              key={p}
              className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-sm"
            >
              <span className="font-mono" style={{ color: "var(--text-primary)" }}>{p}</span>
              <button
                onClick={() => removePattern(p)}
                className="text-xs transition"
                style={{ color: "var(--char-error)" }}
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
            className="flex-1 rounded-xl border px-3 py-2 text-sm outline-none transition focus:border-emerald-500/50"
            style={{
              borderColor: "var(--border-strong)",
              background: "var(--bg-elevated)",
              color: "var(--text-primary)",
            }}
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
        <p className="mb-3 text-sm" style={{ color: "var(--text-secondary)" }}>
          Export everything Typr has learned. Bigram stats, sessions and your
          blocklist as a single JSON file. It never leaves this device unless
          you share it.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleCopy}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm transition hover:bg-white/5"
          >
            {copied ? "Copied!" : "Copy to clipboard"}
          </button>
          <button
            onClick={handleDownload}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm transition hover:bg-white/5"
          >
            Download .json
          </button>
          <button
            onClick={handlePreview}
            className="rounded-xl border border-white/10 px-4 py-2 text-sm transition hover:bg-white/5"
          >
            {exportJson ? "Hide preview" : "Preview"}
          </button>
          <button
            onClick={handleDelete}
            className="ml-auto rounded-xl border border-rose-500/30 px-4 py-2 text-sm text-rose-400 transition hover:bg-rose-500/10"
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
    <section
      className="rounded-2xl border p-5"
      style={{
        borderColor: "var(--border-strong)",
        background: "var(--bg-surface)",
      }}
    >
      <h3 className="mb-3 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
        {title}
      </h3>
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

function IconSun() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function IconMoon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
