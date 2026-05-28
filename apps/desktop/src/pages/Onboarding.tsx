import { useState } from "react";
import { api } from "../api";

interface Props {
  onComplete: () => void;
}

const steps = [
  {
    title: "Welcome to Typr",
    body: "Typr learns from how you actually type and builds personalized drills to fix your weak spots. Everything stays on your device — nothing is ever uploaded.",
  },
  {
    title: "Privacy first",
    body: "Window titles are hashed, password managers and terminals are blocked by default, and you can pause or disable capture at any time from the sidebar, the tray, or a global hotkey.",
  },
  {
    title: "Your consent",
    body: "System-wide capture needs your explicit permission. Only enable Typr on your own personal machine — never to monitor someone else.",
  },
];

export function Onboarding({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [consent, setConsent] = useState(false);

  async function finish() {
    await api.setOnboardingComplete();
    onComplete();
  }

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-md animate-fade-in-up rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-2xl backdrop-blur">
        <div className="mb-6 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 font-bold text-white shadow-lg shadow-indigo-500/30">
            T
          </div>
          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-6 bg-indigo-400" : "w-1.5 bg-white/15"
                }`}
              />
            ))}
          </div>
        </div>

        <h2 className="text-2xl font-bold tracking-tight">{current.title}</h2>
        <p className="mt-3 leading-relaxed text-slate-300">{current.body}</p>

        {isLast && (
          <label className="mt-5 flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-indigo-500"
            />
            I understand Typr records keystrokes locally to improve my typing,
            and I will not use it to monitor others.
          </label>
        )}

        <div className="mt-7 flex items-center justify-between">
          {step > 0 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="rounded-xl px-4 py-2 text-sm text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
            >
              Back
            </button>
          ) : (
            <span />
          )}
          {!isLast ? (
            <button
              onClick={() => setStep(step + 1)}
              className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:opacity-90"
            >
              Continue
            </button>
          ) : (
            <button
              disabled={!consent}
              onClick={finish}
              className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Get started
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
