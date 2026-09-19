import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../api";
import { useAuth } from "../auth";
import { BusyBasket } from "../busyBasket";
import { Button, Companion, Shell } from "../ui";

export const PROFESSIONS = [
  "Student",
  "Software / Engineering",
  "Design",
  "Product / Program",
  "Founder / Self-employed",
  "Teacher / Academic",
  "Healthcare",
  "Finance / Legal",
  "Sales / Marketing",
  "Operations / Admin",
  "Creative / Media",
  "Trades / Field work",
  "Caring for family",
  "Between things",
];

export const USE_CASES = [
  "Work and deadlines",
  "Study and exams",
  "Health and fitness",
  "Family and home",
  "Side projects",
  "Habits and routines",
  "Money and bills",
  "Travel plans",
  "Social life",
  "Appointments",
];

const STAGES = 4;

function splitExtra(value: string) {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function AttunePage() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [stage, setStage] = useState(0);
  const [roles, setRoles] = useState<string[]>([]);
  const [roleOther, setRoleOther] = useState("");
  const [age, setAge] = useState("");
  const [busy, setBusy] = useState(0);
  const [uses, setUses] = useState<string[]>([]);
  const [useOther, setUseOther] = useState("");
  const [saving, setSaving] = useState(false);

  const chosenRoles = useMemo(() => [...roles, ...splitExtra(roleOther)], [roles, roleOther]);
  const chosenUses = useMemo(() => [...uses, ...splitExtra(useOther)], [uses, useOther]);

  const toggle = (list: string[], set: (v: string[]) => void, item: string) =>
    set(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

  const leave = () => navigate("/", { replace: true });

  const submit = async () => {
    setSaving(true);
    try {
      await api.saveProfile({
        professions: chosenRoles.length ? chosenRoles : undefined,
        age: Number(age) || undefined,
        busy_level: busy || undefined,
        use_cases: chosenUses.length ? chosenUses : undefined,
      });
      await refreshUser();
    } catch {
      /* never block a new user on an analytics answer */
    } finally {
      setSaving(false);
      leave();
    }
  };

  const canAdvance =
    stage === 0
      ? chosenRoles.length > 0
      : stage === 1
        ? Boolean(Number(age))
        : stage === 2
          ? busy > 0
          : true;

  return (
    <Shell>
      <div className="attune-screen">
        <div className="attune-card fade-up">
          <header className="attune-head">
            <Companion size={38} />
            <div>
              <h1 className="attune-title">Attune</h1>
              <p className="attune-sub">
                Four quick things so LifeOS starts out shaped like your life.
              </p>
            </div>
            <div className="attune-count">
              {stage + 1} / {STAGES}
            </div>
          </header>

          <div className="attune-progress" aria-hidden>
            <span style={{ width: `${((stage + 1) / STAGES) * 100}%` }} />
          </div>

          {stage === 0 ? (
            <section className="attune-stage fade-in">
              <h2 className="attune-q">What do you spend your days doing?</h2>
              <p className="attune-hint">Pick everything that fits — most people wear a few hats.</p>
              <div className="chip-wrap">
                {PROFESSIONS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={`chip${roles.includes(item) ? " is-on" : ""}`}
                    onClick={() => toggle(roles, setRoles, item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <input
                className="field-input attune-input"
                placeholder="Something else? Separate with commas"
                value={roleOther}
                onChange={(e) => setRoleOther(e.target.value)}
              />
            </section>
          ) : null}

          {stage === 1 ? (
            <section className="attune-stage attune-stage-center fade-in">
              <h2 className="attune-q">How old are you?</h2>
              <p className="attune-hint">It helps us read the rest of your answers.</p>
              <div className="age-well">
                <input
                  className="age-input"
                  type="number"
                  min={5}
                  max={120}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="24"
                  autoFocus
                />
                <span>years</span>
              </div>
            </section>
          ) : null}

          {stage === 2 ? (
            <section className="attune-stage fade-in">
              <h2 className="attune-q">How packed is a normal week?</h2>
              <p className="attune-hint">
                Drag the pieces into the basket — or just tap them. The fuller it gets, the busier
                you are.
              </p>
              <BusyBasket value={busy} onChange={setBusy} />
            </section>
          ) : null}

          {stage === 3 ? (
            <section className="attune-stage fade-in">
              <h2 className="attune-q">What will you lean on LifeOS for?</h2>
              <p className="attune-hint">Pick as many as fit.</p>
              <div className="chip-wrap">
                {USE_CASES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={`chip${uses.includes(item) ? " is-on" : ""}`}
                    onClick={() => toggle(uses, setUses, item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <input
                className="field-input attune-input"
                placeholder="Anything else? Separate with commas"
                value={useOther}
                onChange={(e) => setUseOther(e.target.value)}
              />
            </section>
          ) : null}

          <footer className="attune-foot">
            <button type="button" className="tour-skip" onClick={leave}>
              I'll do this later
            </button>
            <div className="attune-actions">
              {stage > 0 ? (
                <Button variant="ghost" onClick={() => setStage((s) => s - 1)}>
                  Back
                </Button>
              ) : null}
              {stage < STAGES - 1 ? (
                <Button onClick={() => setStage((s) => s + 1)} disabled={!canAdvance}>
                  Next
                </Button>
              ) : (
                <Button onClick={() => void submit()} disabled={saving}>
                  {saving ? "Saving…" : "Done — show me around"}
                </Button>
              )}
            </div>
          </footer>
        </div>
      </div>
    </Shell>
  );
}
