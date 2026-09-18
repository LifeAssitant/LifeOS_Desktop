import { HashRouter, Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider, useAuth } from "./auth";
import { LoginPage, RegisterPage } from "./pages/AuthPages";
import { AppLayout, HomePage, RequireAuth, SettingsPage } from "./pages/AppPages";
import { OnboardingPage } from "./pages/OnboardingPage";

function OnboardingGate() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.onboarding_completed) return <Navigate to="/" replace />;
  return <OnboardingPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/onboarding" element={<OnboardingGate />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route index element={<HomePage />} />
            <Route path="calendar" element={<Navigate to="/" replace />} />
            <Route path="tasks" element={<Navigate to="/" replace />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}
