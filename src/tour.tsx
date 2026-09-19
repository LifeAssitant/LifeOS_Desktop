import { useCallback, useEffect, useLayoutEffect, useState } from "react";

import { Companion } from "./ui";

const TOUR_FLAG = "lifeos_tour_pending";
const CARD_WIDTH = 332;
const CARD_HEIGHT = 196;
const HOLE_PAD = 10;

/** Queue the walkthrough — called right after onboarding finishes. */
export function requestTour() {
  try {
    localStorage.setItem(TOUR_FLAG, "1");
  } catch {
    /* private mode just means no tour */
  }
}

function tourPending() {
  try {
    return localStorage.getItem(TOUR_FLAG) === "1";
  } catch {
    return false;
  }
}

function clearTour() {
  try {
    localStorage.removeItem(TOUR_FLAG);
  } catch {
    /* ignore */
  }
}

type Step = {
  id: string;
  /** Element to spotlight. Steps whose target is absent are skipped. */
  target?: string;
  eyebrow?: string;
  title: string;
  body: string;
};

const STEPS: Step[] = [
  {
    id: "intro",
    title: "Meet LifeOS",
    body: "Your day, your tasks and your calendar all live in one conversation. Two minutes here and you will know the whole app.",
  },
  {
    id: "composer",
    target: '[data-tour="composer"]',
    eyebrow: "Talk, don't fill forms",
    title: "Say it in plain words",
    body: "Type, or click the mic and talk. “Dentist Thursday at 4, remind me an hour before.” LifeOS writes the task, books the time and sets the reminder.",
  },
  {
    id: "suggestions",
    target: '[data-tour="suggestions"]',
    eyebrow: "Not sure where to start",
    title: "Borrow a starter",
    body: "Tap any of these to drop a ready-made request into the box. Edit it first if you like.",
  },
  {
    id: "plan",
    target: '[data-tour="plan"]',
    eyebrow: "Your schedule",
    title: "Open the plan",
    body: "A month view and the day's list slide in beside the chat, so you can watch your week change as you talk.",
  },
  {
    id: "mini",
    target: '[data-tour="mini"]',
    eyebrow: "Always in the corner",
    title: "Shrink to a widget",
    body: "Mini leaves a small always-on-top card with whatever is next. Drag it to any corner and it snaps there.",
  },
  {
    id: "account",
    target: '[data-tour="account"]',
    eyebrow: "Everything else",
    title: "Your account and settings",
    body: "Themes, reminder timing, Google Calendar and your AI key all live behind this button.",
  },
  {
    id: "done",
    title: "That's the whole app",
    body: "Start with one sentence about today. You can replay this walkthrough any time from Settings.",
  },
];

type Rect = { top: number; left: number; width: number; height: number };

function measure(selector?: string): Rect | null {
  if (!selector) return null;
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return {
    top: r.top - HOLE_PAD,
    left: r.left - HOLE_PAD,
    width: r.width + HOLE_PAD * 2,
    height: r.height + HOLE_PAD * 2,
  };
}

function cardPosition(rect: Rect | null) {
  if (!rect) {
    return {
      top: Math.max(24, window.innerHeight / 2 - 150),
      left: window.innerWidth / 2 - CARD_WIDTH / 2,
    };
  }
  const below = rect.top + rect.height + 14;
  const fitsBelow = below + CARD_HEIGHT < window.innerHeight - 16;
  const top = fitsBelow ? below : Math.max(16, rect.top - CARD_HEIGHT - 14);
  const left = Math.min(
    Math.max(16, rect.left + rect.width / 2 - CARD_WIDTH / 2),
    window.innerWidth - CARD_WIDTH - 16
  );
  return { top, left };
}

export function Tour() {
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    if (!tourPending()) return;
    // Let the home screen paint before we start measuring it.
    const t = window.setTimeout(() => setActive(true), 450);
    return () => window.clearTimeout(t);
  }, []);

  const step = STEPS[index];

  const finish = useCallback(() => {
    clearTour();
    setActive(false);
  }, []);

  const next = useCallback(() => {
    setIndex((i) => {
      if (i >= STEPS.length - 1) {
        clearTour();
        setActive(false);
        return i;
      }
      return i + 1;
    });
  }, []);

  const back = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  useLayoutEffect(() => {
    if (!active || !step) return;
    const sync = () => setRect(measure(step.target));
    sync();
    const timer = window.setInterval(sync, 350);
    window.addEventListener("resize", sync);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("resize", sync);
    };
  }, [active, step]);

  // A target that never appears (Mini outside Electron) should not strand the tour.
  useEffect(() => {
    if (!active || !step?.target) return;
    if (document.querySelector(step.target)) return;
    const t = window.setTimeout(() => {
      if (!document.querySelector(step.target as string)) next();
    }, 600);
    return () => window.clearTimeout(t);
  }, [active, step, next]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      if (e.key === "Enter" || e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, finish, next, back]);

  if (!active || !step) return null;

  const isIntro = step.id === "intro";
  const isLast = index === STEPS.length - 1;
  const pos = cardPosition(rect);

  return (
    <div className="tour-root" role="dialog" aria-modal="true" aria-label="LifeOS walkthrough">
      {rect ? (
        <>
          <div className="tour-veil" style={{ top: 0, left: 0, right: 0, height: Math.max(0, rect.top) }} />
          <div
            className="tour-veil"
            style={{ top: rect.top + rect.height, left: 0, right: 0, bottom: 0 }}
          />
          <div
            className="tour-veil"
            style={{ top: rect.top, left: 0, width: Math.max(0, rect.left), height: rect.height }}
          />
          <div
            className="tour-veil"
            style={{ top: rect.top, left: rect.left + rect.width, right: 0, height: rect.height }}
          />
          <div
            className="tour-ring"
            style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
          />
        </>
      ) : (
        <div className="tour-veil tour-veil-full" />
      )}

      <div
        className={`tour-card${isIntro ? " is-intro" : ""}`}
        style={{ top: pos.top, left: pos.left, width: CARD_WIDTH }}
      >
        {isIntro || isLast ? <Companion size={44} /> : null}
        {step.eyebrow ? <span className="tour-eyebrow">{step.eyebrow}</span> : null}
        <h2 className="tour-title">{step.title}</h2>
        <p className="tour-body">{step.body}</p>

        <div className="tour-foot">
          <div className="tour-dots" aria-hidden>
            {STEPS.map((s, i) => (
              <i key={s.id} className={i === index ? "is-on" : undefined} />
            ))}
          </div>
          <div className="tour-buttons">
            {index > 0 && !isLast ? (
              <button type="button" className="tour-skip" onClick={back}>
                Back
              </button>
            ) : null}
            {!isLast ? (
              <button type="button" className="tour-skip" onClick={finish}>
                Skip
              </button>
            ) : null}
            <button type="button" className="tour-next" onClick={next}>
              {isIntro ? "Show me around" : isLast ? "Start using LifeOS" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
