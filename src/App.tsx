import { HashRouter, Navigate, Route, Routes } from "react-router-dom";

import { AuthProvider, useAuth } from "./auth";
import { LoginPage, RegisterPage } from "./pages/AuthPages";
import { AppLayout, HomePage, RequireAuth, SettingsPage } from "./pages/AppPages";
import { BillingPage } from "./pages/BillingPage";
import { GardenLanding } from "./pages/GardenLanding";
import { GardenStorePage } from "./pages/GardenStorePage";
import { AttunePage } from "./pages/AttunePage";
import { MiniWidget } from "./pages/MiniWidget";
import { OnboardingPage } from "./pages/OnboardingPage";
import { PlansOfferPage } from "./pages/PlansOfferPage";
import { plansOffered } from "./plansGate";
import { ThemeProvider } from "./themeMode";

function OnboardingGate() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.onboarding_completed) return <Navigate to="/" replace />;
  return <OnboardingPage />;
}

function PlansOfferGate() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.onboarding_completed) return <Navigate to="/onboarding" replace />;
  if (plansOffered()) return <Navigate to="/attune" replace />;
  return <PlansOfferPage />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <HashRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/onboarding" element={<OnboardingGate />} />
            <Route
              path="/plans"
              element={
                <RequireAuth>
                  <PlansOfferGate />
                </RequireAuth>
              }
            />
            <Route
              path="/garden"
              element={
                <RequireAuth>
                  <GardenLanding />
                </RequireAuth>
              }
            />
            <Route
              path="/garden/store"
              element={
                <RequireAuth>
                  <GardenStorePage />
                </RequireAuth>
              }
            />
            <Route path="/mini" element={<MiniWidget />} />
            <Route
              path="/attune"
              element={
                <RequireAuth>
                  <AttunePage />
                </RequireAuth>
              }
            />
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
              <Route path="billing" element={<BillingPage />} />
            </Route>
          </Routes>
        </HashRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
