import { useCallback, useEffect, useMemo, useState } from "react";

import { api, getAccessToken } from "../api";
import { Companion } from "../ui";

type NextItem = {
  id: string;
  title: string;
  when: string;
  kind: "event" | "task";
};

function countdown(iso: string) {
  const diff = Date.parse(iso) - Date.now();
  if (!Number.isFinite(diff)) return "";
  const minutes = Math.round(diff / 60000);
  if (minutes < -60) return "earlier today";
  if (minutes < 0) return "now";
  if (minutes < 1) return "in under a minute";
  if (minutes < 60) return `in ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `in ${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? "tomorrow" : `in ${days} days`;
}

function clockTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function MiniWidget() {
  const [next, setNext] = useState<NextItem | null>(null);
  const [laterCount, setLaterCount] = useState(0);
  const [signedOut, setSignedOut] = useState(false);
  const [, setTick] = useState(0);

  const load = useCallback(async () => {
    if (!getAccessToken()) {
      setSignedOut(true);
      return;
    }
    try {
      const now = new Date();
      const horizon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const [tasks, events] = await Promise.all([
        api.tasks("open"),
        api.events(now.toISOString(), horizon.toISOString()),
      ]);
      setSignedOut(false);

      const upcoming: NextItem[] = [];
      for (const e of events) {
        upcoming.push({ id: e.id, title: e.title, when: e.start_at, kind: "event" });
      }
      for (const t of tasks) {
        if (t.due_at) upcoming.push({ id: t.id, title: t.title, when: t.due_at, kind: "task" });
      }
      upcoming.sort((a, b) => a.when.localeCompare(b.when));

      const cutoff = Date.now() - 15 * 60 * 1000;
      const ahead = upcoming.filter((item) => Date.parse(item.when) > cutoff);
      setNext(ahead[0] ?? null);
      setLaterCount(Math.max(0, ahead.length - 1));
    } catch {
      /* keep showing the last known item while offline */
    }
  }, []);

  useEffect(() => {
    void load();
    const refresh = window.setInterval(() => void load(), 60_000);
    const clock = window.setInterval(() => setTick((t) => t + 1), 30_000);
    return () => {
      window.clearInterval(refresh);
      window.clearInterval(clock);
    };
  }, [load]);

  useEffect(() => {
    const root = document.getElementById("root");
    document.documentElement.classList.add("is-mini");
    document.body.classList.add("is-mini");
    root?.classList.add("is-mini");
    return () => {
      document.documentElement.classList.remove("is-mini");
      document.body.classList.remove("is-mini");
      root?.classList.remove("is-mini");
    };
  }, []);

  const body = useMemo(() => {
    if (signedOut) return { title: "Sign in to see your day", meta: "Open LifeOS" };
    if (!next) return { title: "Nothing scheduled", meta: "You are clear for now" };
    return {
      title: next.title,
      meta: `${next.kind === "event" ? "Event" : "Task"} · ${clockTime(next.when)} · ${countdown(next.when)}`,
    };
  }, [next, signedOut]);

  return (
    <div className="mini-card">
      <div className="mini-drag">
        <div className="mini-head">
          <Companion size={26} />
          <span className="mini-label">Up next</span>
          <div className="mini-actions">
            <button
              type="button"
              className="mini-btn"
              title="Open LifeOS"
              aria-label="Open LifeOS"
              onClick={() => void window.lifeosDesktop?.exitMini(false)}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
                <rect x="4" y="4" width="16" height="16" rx="4" stroke="currentColor" strokeWidth="2" />
              </svg>
            </button>
            <button
              type="button"
              className="mini-btn"
              title="Open full screen"
              aria-label="Open full screen"
              onClick={() => void window.lifeosDesktop?.exitMini(true)}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M9 4H4v5M15 20h5v-5M20 9V4h-5M4 15v5h5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="mini-body">
          <p className="mini-title">{body.title}</p>
          <p className="mini-meta">{body.meta}</p>
        </div>

        <div className="mini-foot">
          {laterCount > 0 ? `${laterCount} more ahead` : "Drag me to any corner"}
        </div>
      </div>
    </div>
  );
}
