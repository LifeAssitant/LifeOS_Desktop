import {
  FormEvent,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";

import { api, ChatMessage } from "../api";
import { useAuth } from "../auth";
import { LifeDataProvider, useLifeData } from "../data";
import { useDesktopNotifications } from "../notifications";
import { colors, fonts } from "../theme";
import { AccountMenu, Button, Companion, EmptyHint, Field, Shell } from "../ui";

type PlanChromeValue = {
  setPlanChrome: (next: { label: string; onOpen: () => void } | null) => void;
};

const PlanChromeContext = createContext<PlanChromeValue | null>(null);

function usePlanChrome() {
  const ctx = useContext(PlanChromeContext);
  if (!ctx) throw new Error("usePlanChrome requires provider");
  return ctx;
}

function Layout() {
  const { user, logout, offlineHint } = useAuth();
  useDesktopNotifications(Boolean(user));
  const [planChrome, setPlanChromeState] = useState<{
    label: string;
    onOpen: () => void;
  } | null>(null);

  const setPlanChrome = useCallback((next: { label: string; onOpen: () => void } | null) => {
    setPlanChromeState(next);
  }, []);

  const chromeValue = useMemo(() => ({ setPlanChrome }), [setPlanChrome]);

  return (
    <PlanChromeContext.Provider value={chromeValue}>
      <Shell>
        <div className="app-frame">
          <header className="app-topbar panel fade-up">
            <Link to="/" className="app-brand">
              <Companion size={32} />
              <span className="app-brand-name">LifeOS</span>
            </Link>

            <div className="app-topbar-right">
              {offlineHint ? <span className="app-offline">{offlineHint}</span> : null}
              {planChrome ? (
                <button
                  type="button"
                  className="plan-open-btn"
                  onClick={planChrome.onOpen}
                >
                  <CalendarIcon />
                  <span>
                    <strong>Plan</strong>
                    <small>{planChrome.label}</small>
                  </span>
                </button>
              ) : null}
              <AccountMenu
                name={user?.display_name}
                email={user?.email}
                onLogout={logout}
              />
            </div>
          </header>

          <main className="app-main fade-in">
            <Outlet />
          </main>
        </div>
      </Shell>
    </PlanChromeContext.Provider>
  );
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseLocalDay(iso: string) {
  const d = new Date(iso);
  return dayKey(d);
}

function formatWhen(value?: string | null) {
  if (!value) return "No time set";
  return new Date(value).toLocaleString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(value?: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

type DayItem = {
  id: string;
  title: string;
  when: string;
  kind: "event" | "task";
  source?: "chat" | "manual" | "google";
};

export function HomePage() {
  const { setOfflineHint } = useAuth();
  const { setPlanChrome } = usePlanChrome();
  const { tasks, events, refreshAll, completeTask, deleteEvent, deleteTask } = useLifeData();
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState(() => dayKey(new Date()));
  const [planOpen, setPlanOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll, cursor]);

  const itemsByDay = useMemo(() => {
    const map = new Map<string, DayItem[]>();
    const push = (key: string, item: DayItem) => {
      const list = map.get(key) || [];
      list.push(item);
      map.set(key, list);
    };
    for (const e of events) {
      push(parseLocalDay(e.start_at), {
        id: e.id,
        title: e.title,
        when: e.start_at,
        kind: "event",
        source: e.source,
      });
    }
    for (const t of tasks) {
      if (!t.due_at) continue;
      push(parseLocalDay(t.due_at), {
        id: t.id,
        title: t.title,
        when: t.due_at,
        kind: "task",
        source: t.source,
      });
    }
    for (const [, list] of map) {
      list.sort((a, b) => a.when.localeCompare(b.when));
    }
    return map;
  }, [events, tasks]);

  const monthCells = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<{ key: string; day: number | null; inMonth: boolean }> = [];
    for (let i = 0; i < startPad; i++) cells.push({ key: `pad-${i}`, day: null, inMonth: false });
    for (let d = 1; d <= daysInMonth; d++) {
      const key = dayKey(new Date(year, month, d));
      cells.push({ key, day: d, inMonth: true });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ key: `end-${cells.length}`, day: null, inMonth: false });
    }
    return cells;
  }, [cursor]);

  const selectedItems = useMemo(() => itemsByDay.get(selected) || [], [itemsByDay, selected]);

  const selectedLabel = useMemo(() => {
    const [y, m, d] = selected.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  }, [selected]);

  const loadChat = useCallback(async () => {
    try {
      const history = await api.chatHistory();
      setMessages(history);
      setOfflineHint(null);
    } catch {
      setOfflineHint("We’ll sync when you’re back.");
    }
  }, [setOfflineHint]);

  useEffect(() => {
    void loadChat();
  }, [loadChat]);

  useEffect(() => {
    const el = bottomRef.current?.parentElement;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || sending) return;
    setSending(true);
    setError("");
    const text = draft.trim();
    setDraft("");
    const optimistic: ChatMessage = {
      id: `local-user-${Date.now()}`,
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    try {
      const reply = await api.chatSend(text);
      setMessages((prev) => [...prev.filter((m) => m.id !== optimistic.id), optimistic, reply]);
      await refreshAll();
      await loadChat();

      const entityId =
        reply.linked_entity_ids?.[0] ||
        reply.actions?.find((a) => a.entity_id && !a.undone)?.entity_id;
      if (entityId) {
        // Pick day from freshly fetched lists on next tick via functional state isn't available;
        // use reply action time isn't stored — query current module state after refresh by re-fetch.
        const [freshTasks, freshEvents] = await Promise.all([
          api.tasks("open"),
          api.events(
            new Date(cursor.getFullYear(), cursor.getMonth(), 1).toISOString(),
            new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59).toISOString()
          ),
        ]);
        const matchEvent = freshEvents.find((e) => e.id === entityId);
        const matchTask = freshTasks.find((t) => t.id === entityId);
        const when = matchEvent?.start_at || matchTask?.due_at;
        if (when) {
          const d = new Date(when);
          setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
          setSelected(dayKey(d));
          setPlanOpen(true);
        }
      }
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setDraft(text);
      setError(err instanceof Error ? err.message : "Chat failed");
    } finally {
      setSending(false);
    }
  };

  const undo = async (messageId: string, index: number) => {
    await api.chatUndo(messageId, index);
    await Promise.all([refreshAll(), loadChat()]);
  };

  const removeItem = async (item: DayItem) => {
    if (item.source === "google") return;
    if (item.kind === "event") await deleteEvent(item.id);
    else await deleteTask(item.id);
  };

  useEffect(() => {
    if (!planOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPlanOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [planOpen]);

  const planLabel = useMemo(() => {
    if (selectedItems.length) return `${selectedItems.length} on day`;
    return selectedLabel.replace(/,.*/, "");
  }, [selectedItems.length, selectedLabel]);

  const openPlan = useCallback(() => setPlanOpen(true), []);

  useEffect(() => {
    setPlanChrome({ label: planLabel, onOpen: openPlan });
    return () => setPlanChrome(null);
  }, [planLabel, openPlan, setPlanChrome]);

  return (
    <div className="fade-up home-workspace">
      <section className="panel panel-warm home-chat">
        <div className="chat-scroll clay-well chat-stream">
          {!messages.length ? (
            <div className="fade-in chat-empty">
              <Companion size={52} />
              <p className="chat-empty-title">Say anything</p>
              <EmptyHint>
                Ask LifeOS to schedule something — open Plan anytime to review your month.
              </EmptyHint>
            </div>
          ) : null}
          {messages.map((m) => (
            <div
              key={m.id}
              className={`chat-bubble ${m.role === "user" ? "is-user" : "is-assistant"}`}
            >
              <div>{m.content}</div>
              {m.actions?.map((a, idx) =>
                a.undone ? null : (
                  <button
                    key={`${m.id}-${idx}`}
                    className="chat-undo"
                    onClick={() => void undo(m.id, idx)}
                  >
                    {a.summary} · Undo
                  </button>
                )
              )}
            </div>
          ))}
          {sending ? <div className="fade-in chat-thinking">LifeOS is thinking…</div> : null}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={send} className="chat-composer">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Talk to LifeOS…"
            className="clay-input chat-input"
          />
          <Button type="submit" disabled={sending}>
            Send
          </Button>
        </form>
        {error ? <p className="chat-error">{error}</p> : null}
      </section>

      {planOpen ? (
        <>
          <button
            type="button"
            className="plan-backdrop"
            aria-label="Close plan"
            onClick={() => setPlanOpen(false)}
          />
          <aside className="panel panel-cool plan-drawer" role="dialog" aria-label="Your plan">
            <div className="home-section-head">
              <div>
                <h1 className="home-title plan-title">
                  {cursor.toLocaleString(undefined, { month: "long", year: "numeric" })}
                </h1>
                <p className="home-sub">Your calendar and day list.</p>
              </div>
              <div className="home-month-nav">
                <Button
                  variant="ghost"
                  onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
                >
                  ‹
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    const now = new Date();
                    setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
                    setSelected(dayKey(now));
                  }}
                >
                  Today
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
                >
                  ›
                </Button>
                <button
                  type="button"
                  className="plan-close"
                  aria-label="Close plan"
                  onClick={() => setPlanOpen(false)}
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="cal-weekdays">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>

            <div className="clay-well cal-grid">
              {monthCells.map((cell) => {
                if (!cell.inMonth || cell.day == null) {
                  return <div key={cell.key} className="day-cell-spacer" />;
                }
                const count = itemsByDay.get(cell.key)?.length || 0;
                const isSelected = cell.key === selected;
                const isToday = cell.key === dayKey(new Date());
                return (
                  <button
                    key={cell.key}
                    type="button"
                    className={`soft-btn day-cell${isSelected ? " is-selected" : ""}${isToday ? " is-today" : ""}`}
                    onClick={() => setSelected(cell.key)}
                  >
                    <span className="day-num">{cell.day}</span>
                    <span className="day-dots">
                      {count > 0 ? (
                        <>
                          <span
                            className={isSelected || isToday ? "dot-pulse" : undefined}
                            style={{ background: colors.moss }}
                          />
                          {count > 1 ? <span style={{ background: colors.apricot }} /> : null}
                        </>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="home-day-block">
              <div className="home-day-label">{selectedLabel}</div>
              {selectedItems.length ? (
                <div className="day-list">
                  {selectedItems.map((item, index) => (
                    <div
                      key={`${item.kind}-${item.id}`}
                      className="stagger-item day-row"
                      style={{ animationDelay: `${index * 40}ms` }}
                    >
                      <span
                        className="day-row-dot"
                        style={{
                          background:
                            item.source === "google"
                              ? colors.muted
                              : item.kind === "event"
                                ? colors.moss
                                : colors.apricot,
                        }}
                      />
                      <div className="day-row-body">
                        <div className="day-row-title">{item.title}</div>
                        <div className="day-row-meta">
                          {item.source === "google" ? "Google" : item.kind} ·{" "}
                          {formatTime(item.when) || formatWhen(item.when)}
                        </div>
                      </div>
                      <div className="day-row-actions">
                        {item.kind === "task" ? (
                          <button
                            type="button"
                            className="text-action"
                            onClick={() => void completeTask(item.id)}
                          >
                            Done
                          </button>
                        ) : null}
                        {item.source === "google" ? null : (
                          <button
                            type="button"
                            className="text-action muted"
                            onClick={() => void removeItem(item)}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyHint>Nothing on this day yet. Ask LifeOS to add something.</EmptyHint>
              )}
            </div>
          </aside>
        </>
      ) : null}
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 10h18" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const { refreshAll } = useLifeData();
  const [mode, setMode] = useState<"hosted" | "byok">(user?.ai_mode ?? "hosted");
  const [key, setKey] = useState("");
  const [remindBefore, setRemindBefore] = useState(String(user?.remind_before_minutes ?? 15));
  const [msg, setMsg] = useState("");
  const [calendarConnected, setCalendarConnected] = useState(
    Boolean(user?.google_calendar_connected)
  );
  const [calendarBusy, setCalendarBusy] = useState(false);

  useEffect(() => {
    setCalendarConnected(Boolean(user?.google_calendar_connected));
  }, [user?.google_calendar_connected]);

  useEffect(() => {
    void api.googleCalendarStatus().then((s) => setCalendarConnected(s.connected)).catch(() => null);
  }, []);

  useEffect(() => {
    const onConnected = async () => {
      setMsg("Google Calendar connected. Syncing…");
      try {
        await api.googleCalendarSync();
        await Promise.all([refreshUser(), refreshAll()]);
        setCalendarConnected(true);
        setMsg("Google Calendar synced.");
      } catch (err) {
        setMsg(err instanceof Error ? err.message : "Sync failed");
      }
    };
    window.addEventListener("lifeos-calendar-connected", onConnected);
    return () => window.removeEventListener("lifeos-calendar-connected", onConnected);
  }, [refreshAll, refreshUser]);

  const save = async () => {
    try {
      await api.updateAi({
        ai_mode: mode,
        gemini_api_key: mode === "byok" ? key || undefined : undefined,
      });
      await api.updateMe({ remind_before_minutes: Number(remindBefore) || 15 });
      await refreshUser();
      setKey("");
      setMsg("Saved.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Save failed");
    }
  };

  const buy = async () => {
    try {
      const { checkout_url } = await api.checkout();
      window.open(checkout_url, "_blank");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Stripe not configured");
    }
  };

  const connectCalendar = async () => {
    setCalendarBusy(true);
    setMsg("");
    try {
      const { url } = await api.googleCalendarConnect();
      if (window.lifeosDesktop?.openExternal) await window.lifeosDesktop.openExternal(url);
      else window.open(url, "_blank");
      setMsg("Finish connecting in your browser…");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Could not start Google Calendar connect");
    } finally {
      setCalendarBusy(false);
    }
  };

  const syncCalendar = async () => {
    setCalendarBusy(true);
    setMsg("");
    try {
      const result = await api.googleCalendarSync();
      await refreshAll();
      setMsg(`Synced ${result.synced} events.`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setCalendarBusy(false);
    }
  };

  const disconnectCalendar = async () => {
    setCalendarBusy(true);
    setMsg("");
    try {
      await api.googleCalendarDisconnect();
      await Promise.all([refreshUser(), refreshAll()]);
      setCalendarConnected(false);
      setMsg("Google Calendar disconnected.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Disconnect failed");
    } finally {
      setCalendarBusy(false);
    }
  };

  return (
    <div className="fade-up settings-page panel">
      <div className="settings-back">
        <Link to="/" className="text-action">
          ← Home
        </Link>
      </div>
      <h1 className="home-title">Settings</h1>
      <p className="home-sub" style={{ marginBottom: 28 }}>
        Calendar, reminders, and AI.
      </p>

      <div className="clay-well settings-block">
        <div style={{ fontWeight: 700 }}>{user?.email}</div>
        <div style={{ color: colors.muted, marginTop: 6, fontSize: 13 }}>
          Credits: {user?.credit_balance}
          {" · "}
          BYOK: {user?.has_byok_key ? "saved" : "not set"}
        </div>
      </div>

      <div className="settings-block panel panel-soft">
        <div className="settings-block-title">Google Calendar</div>
        <p className="home-sub" style={{ marginBottom: 14 }}>
          {calendarConnected
            ? "Your Google events appear quietly on the month view."
            : "Connect once — LifeOS reads your primary calendar (no edits)."}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {calendarConnected ? (
            <>
              <Button variant="ghost" disabled={calendarBusy} onClick={() => void syncCalendar()}>
                Sync now
              </Button>
              <Button variant="ghost" disabled={calendarBusy} onClick={() => void disconnectCalendar()}>
                Disconnect
              </Button>
            </>
          ) : (
            <Button disabled={calendarBusy} onClick={() => void connectCalendar()}>
              {calendarBusy ? "Opening…" : "Connect Google Calendar"}
            </Button>
          )}
        </div>
      </div>

      <div className="settings-block">
        <div className="settings-block-title">AI</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <Button variant={mode === "hosted" ? "primary" : "ghost"} onClick={() => setMode("hosted")}>
            LifeOS API
          </Button>
          <Button variant={mode === "byok" ? "primary" : "ghost"} onClick={() => setMode("byok")}>
            My Gemini key
          </Button>
        </div>

        {mode === "byok" ? (
          <Field label="Gemini API key" value={key} onChange={setKey} type="password" placeholder="AIza…" />
        ) : null}
      </div>

      <div className="settings-block">
        <Field
          label="Remind me before (minutes)"
          value={remindBefore}
          onChange={setRemindBefore}
          type="number"
        />
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
        <Button onClick={save}>Save</Button>
        <Button variant="ghost" onClick={() => void buy()}>
          Buy credits
        </Button>
      </div>
      {msg ? <p style={{ color: colors.muted, fontSize: 13, marginTop: 12 }}>{msg}</p> : null}
    </div>
  );
}

export function AppLayout() {
  return (
    <LifeDataProvider>
      <Layout />
    </LifeDataProvider>
  );
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) navigate("/login");
    else if (!user.onboarding_completed) navigate("/onboarding");
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <Shell>
        <div style={{ padding: 40, fontFamily: fonts.display, fontSize: 20 }}>Opening LifeOS…</div>
      </Shell>
    );
  }
  return <>{children}</>;
}
