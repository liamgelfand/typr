import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { UpdateNotice } from "./components/UpdateNotice";
import { api } from "./api";
import { Dashboard } from "./pages/Dashboard";
import { Drills } from "./pages/Drills";
import { Onboarding } from "./pages/Onboarding";
import { Practice } from "./pages/Practice";
import { Settings } from "./pages/Settings";

export default function App() {
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    api.getOnboardingComplete().then((v) => {
      setOnboarded(v);
      setReady(true);
    });
  }, []);

  return (
    <>
      <UpdateNotice />
      {!ready ? (
        <div className="flex min-h-screen items-center justify-center text-slate-500">
          Loading…
        </div>
      ) : !onboarded ? (
        <Onboarding onComplete={() => setOnboarded(true)} />
      ) : (
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="practice" element={<Practice />} />
              <Route path="drills" element={<Drills />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      )}
    </>
  );
}
