import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../api";
import { useAuth } from "../auth";
import { colors } from "../theme";
import { requestTour } from "../tour";
import { Button, Companion, Shell, ThemeToggle } from "../ui";

const steps = [
  {
    title: "Talk it out",
    body: "Tell LifeOS what you need in plain words. It writes the tasks and books the events.",
    tone: colors.mint,
    tint: "var(--mint-soft)",
  },
  {
    title: "See your day",
    body: "A month view and a day list, side by side with the conversation.",
    tone: colors.peach,
    tint: "var(--peach-soft)",
  },
  {
    title: "Get nudged",
    body: "Desktop notifications arrive before something starts or slips.",
    tone: colors.sky,
    tint: "var(--sky-soft)",
  },
];

export function OnboardingPage() {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const finish = async () => {
    setLoading(true);
    try {
      await api.updateMe({ onboarding_completed: true });
      requestTour();
      await refreshUser();
      navigate("/attune");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell>
      <div className="onboard-screen">
        <div className="onboard-card fade-up">
          <Companion size={44} />
          <h1 className="onboard-title">Welcome to LifeOS</h1>
          <p className="onboard-lede">
            One conversation keeps your tasks, calendar and reminders in the same place.
          </p>

          <div className="onboard-steps">
            {steps.map((s, i) => (
              <div key={s.title} className="onboard-step" style={{ animationDelay: `${i * 70}ms` }}>
                <span
                  className="onboard-step-icon"
                  style={{ background: s.tint, color: s.tone }}
                  aria-hidden
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="5" fill="currentColor" />
                  </svg>
                </span>
                <div>
                  <strong>{s.title}</strong>
                  <p>{s.body}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="onboard-theme">
            <div className="onboard-theme-label">Pick a look — you can change it any time</div>
            <ThemeToggle />
          </div>

          <Button onClick={finish} disabled={loading}>
            {loading ? "Opening…" : "Start using LifeOS"}
          </Button>
        </div>
      </div>
    </Shell>
  );
}
