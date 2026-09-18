import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../api";
import { useAuth } from "../auth";
import { Button, Companion, Shell } from "../ui";
import { colors } from "../theme";

const steps = [
  { title: "Talk it out", body: "Tell LifeOS what you need. It turns words into tasks." },
  { title: "See your day", body: "A simple calendar — just what’s next." },
  { title: "Gentle nudges", body: "Tray notifications when something’s due or still open." },
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
      <div style={{ maxWidth: 520, margin: "0 auto", padding: 40 }}>
        <Companion size={72} />
        <h1 style={{ color: colors.ink }}>Welcome to LifeOS</h1>
        <div style={{ display: "grid", gap: 12, marginBottom: 24 }}>
          {steps.map((s) => (
            <div
              key={s.title}
              style={{
                background: colors.card,
                border: `1px solid ${colors.line}`,
                borderRadius: 16,
                padding: 16,
              }}
            >
              <strong>{s.title}</strong>
              <p style={{ margin: "6px 0 0", color: colors.muted }}>{s.body}</p>
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
