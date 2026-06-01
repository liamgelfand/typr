import { useCallback, useEffect, useState } from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

type Phase = "idle" | "available" | "downloading" | "installing" | "error";

export function UpdateNotice() {
  const [update, setUpdate] = useState<Update | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [pct, setPct] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Ask GitHub Releases whether a newer signed build exists. Any failure
    // (offline, running outside Tauri, no release yet) is non-fatal.
    (async () => {
      try {
        const found = await check();
        if (!cancelled && found) {
          setUpdate(found);
          setPhase("available");
        }
      } catch (e) {
        console.warn("update check failed", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const install = useCallback(async () => {
    if (!update) return;
    setPhase("downloading");
    setError(null);
    let total = 0;
    let received = 0;
    try {
      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case "Started":
            total = event.data.contentLength ?? 0;
            setPct(total > 0 ? 0 : null);
            break;
          case "Progress":
            received += event.data.chunkLength;
            if (total > 0) setPct(Math.min(100, Math.round((received / total) * 100)));
            break;
          case "Finished":
            setPct(100);
            break;
        }
      });
      setPhase("installing");
      await relaunch();
    } catch (e) {
      console.error("update install failed", e);
      setError(typeof e === "string" ? e : (e as Error)?.message ?? "Update failed");
      setPhase("error");
    }
  }, [update]);

  if (phase === "idle" || dismissed || !update) return null;

  return (
    <div className="animate-fade-in-up fixed bottom-5 right-5 z-50 w-80 rounded-2xl border border-white/10 bg-slate-900/95 p-4 shadow-2xl backdrop-blur">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-100">
            Update available
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            Version {update.version} is ready to install.
          </p>

          {phase === "available" && (
            <div className="mt-3 flex gap-2">
              <button
                onClick={install}
                className="rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:opacity-90"
              >
                Install &amp; restart
              </button>
              <button
                onClick={() => setDismissed(true)}
                className="rounded-lg px-3 py-1.5 text-xs text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
              >
                Later
              </button>
            </div>
          )}

          {phase === "downloading" && (
            <div className="mt-3">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-[width] duration-150 ${
                    pct === null ? "w-1/3 animate-pulse" : ""
                  }`}
                  style={pct === null ? undefined : { width: `${pct}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                {pct === null ? "Downloading…" : `Downloading… ${pct}%`}
              </p>
            </div>
          )}

          {phase === "installing" && (
            <p className="mt-3 text-xs text-indigo-300">
              Installing — the app will restart…
            </p>
          )}

          {phase === "error" && (
            <div className="mt-3">
              <p className="text-xs text-rose-400">{error}</p>
              <button
                onClick={install}
                className="mt-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium transition hover:bg-white/15"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
