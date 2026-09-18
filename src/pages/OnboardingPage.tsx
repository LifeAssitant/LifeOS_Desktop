import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../api";
import { useAuth } from "../auth";
import { colors, fonts, radii } from "../theme";
import { Button, Companion, Shell } from "../ui";

const steps = [
  { title: "Talk it out", body: "Tell LifeOS what you need. It turns words into tasks and events." },
  { title: "See your day", body: "A calm calendar and task list — just what’s next." },
  { title: "Gentle nudges", body: "Desktop tray notifications when something’s due or still open." },
];

export function OnboardingPage() {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const finish = async () => {
    setLoading(true);
    try {
      await api.updateMe({ onboarding_completed: true });
      await refreshUser();
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell>
      <div className="fade-up" style={{ maxWidth: 540, margin: "0 auto", padding: "56px 28px" }}>
        <Companion size={80} />
        <h1
          style={{
            fontFamily: fonts.display,
            fontSize: 40,
            letterSpacing: -0.8,
            margin: "16px 0 8px",
            color: colors.ink,
          }}
        >
          Welcome to LifeOS
        </h1>
        <p style={{ color: colors.muted, marginTop: 0, marginBottom: 28, lineHeight: 1.5 }}>
          A warm companion for an overwhelmed mind — simple on purpose.
        </p>
        <div style={{ display: "grid", gap: 12, marginBottom: 28 }}>
          {steps.map((s, i) => (
            <div
              key={s.title}
              className="fade-up"
              style={{
                background: colors.paper,
                border: `1px solid ${colors.lineSoft}`,
                borderRadius: radii.lg,
                padding: 16,
                animationDelay: `${i * 80}ms`,
              }}
            >
              <strong style={{ fontFamily: fonts.display, fontSize: 20 }}>{s.title}</strong>
              <p style={{ margin: "6px 0 0", color: colors.muted, lineHeight: 1.45 }}>{s.body}</p>
            </div>
          ))}
        </div>
        <Button onClick={finish} disabled={loading}>
          {loading ? "…" : "Enter LifeOS"}
        </Button>
      </div>
    </Shell>
  );
}
