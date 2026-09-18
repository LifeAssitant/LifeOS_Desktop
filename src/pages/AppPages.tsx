import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { api, ChatMessage } from "../api";
import { useAuth } from "../auth";
import { LifeDataProvider, useLifeData } from "../data";
import { useDesktopNotifications } from "../notifications";
import { colors, fonts, radii } from "../theme";
import { Button, Companion, EmptyHint, Field, Shell } from "../ui";

function Layout() {
  const { user, logout, offlineHint } = useAuth();
  useDesktopNotifications(Boolean(user));

  return (
    <Shell>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "196px 1fr",
          minHeight: "100vh",
        }}
      >
        <aside
          style={{
            padding: "18px 12px",
            borderRight: `1px solid ${colors.lineSoft}`,
            background: "rgba(251,247,240,0.5)",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 6px" }}>
            <Companion size={34} />
            <div>
              <div
                style={{
                  fontFamily: fonts.display,
                  fontWeight: 700,
                  fontSize: 20,
                  letterSpacing: -0.4,
                  lineHeight: 1.1,
                }}
              >
                LifeOS
              </div>
              <div style={{ color: colors.muted, fontSize: 11 }}>
                {user?.display_name || user?.email}
              </div>
            </div>
          </div>

          <nav style={{ display: "grid", gap: 4 }}>
            {[
              ["/", "Home"],
              ["/settings", "Settings"],
            ].map(([to, label]) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className="nav-link"
                style={({ isActive }) => ({
                  textDecoration: "none",
                  color: colors.ink,
                  fontWeight: isActive ? 650 : 500,
                  fontSize: 14,
                  background: isActive ? colors.apricotSoft : "transparent",
                  padding: "8px 12px",
                  borderRadius: 10,
                })}
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <div style={{ flex: 1 }} />
          {offlineHint ? (
            <div style={{ color: colors.clay, fontSize: 12, padding: "0 6px" }}>{offlineHint}</div>
          ) : null}
          <Button variant="ghost" onClick={logout}>
            Sign out
          </Button>
        </aside>
        <main style={{ padding: "18px 20px", minWidth: 0 }}>
          <Outlet />
        </main>
      </div>
    </Shell>
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
  const { tasks, events, refreshAll, completeTask, deleteEvent, deleteTask } = useLifeData();
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState(() => dayKey(new Date()));
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
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
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

  return (
    <div
      className="fade-up"
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(300px, 1.05fr) minmax(320px, 0.95fr)",
        gap: 16,
        height: "calc(100vh - 36px)",
        minHeight: 0,
      }}
    >
      <section style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1
              style={{
                margin: 0,
                fontFamily: fonts.display,
                fontSize: 26,
                fontWeight: 650,
                letterSpacing: -0.4,
              }}
            >
              {cursor.toLocaleString(undefined, { month: "long", year: "numeric" })}
            </h1>
            <p style={{ margin: "2px 0 0", color: colors.muted, fontSize: 13 }}>
              Click a day to see what’s planned.
            </p>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
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
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 4,
            fontSize: 11,
            color: colors.muted,
            fontWeight: 650,
            textTransform: "uppercase",
            letterSpacing: 0.04,
            padding: "0 2px",
          }}
        >
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} style={{ textAlign: "center" }}>
              {d}
            </div>
          ))}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 4,
            background: colors.paper,
            border: `1px solid ${colors.lineSoft}`,
            borderRadius: 14,
            padding: 8,
          }}
        >
          {monthCells.map((cell) => {
            if (!cell.inMonth || cell.day == null) {
              return <div key={cell.key} style={{ minHeight: 54 }} />;
            }
            const count = itemsByDay.get(cell.key)?.length || 0;
            const isSelected = cell.key === selected;
            const isToday = cell.key === dayKey(new Date());
            return (
              <button
                key={cell.key}
                type="button"
                className="soft-btn"
                onClick={() => setSelected(cell.key)}
                style={{
                  minHeight: 54,
                  borderRadius: 10,
                  border: isSelected
                    ? `1.5px solid ${colors.apricot}`
                    : isToday
                      ? `1px solid ${colors.moss}`
                      : "1px solid transparent",
                  background: isSelected ? colors.apricotSoft : "transparent",
                  cursor: "pointer",
                  padding: "6px 4px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  color: colors.ink,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: isToday || isSelected ? 700 : 500 }}>
                  {cell.day}
                </span>
                <span style={{ display: "flex", gap: 3, minHeight: 6 }}>
                  {count > 0 ? (
                    <>
                      <span
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: 99,
                          background: colors.moss,
                        }}
                      />
                      {count > 1 ? (
                        <span
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: 99,
                            background: colors.apricot,
                          }}
                        />
                      ) : null}
                    </>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflow: "auto",
            background: "rgba(251,247,240,0.7)",
            border: `1px solid ${colors.lineSoft}`,
            borderRadius: 14,
            padding: 12,
          }}
        >
          <div style={{ fontWeight: 650, fontSize: 14, marginBottom: 8 }}>{selectedLabel}</div>
          {selectedItems.length ? (
            <div style={{ display: "grid", gap: 8 }}>
              {selectedItems.map((item) => (
                <div
                  key={`${item.kind}-${item.id}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    alignItems: "center",
                    padding: "8px 10px",
                    borderRadius: 10,
                    background: item.source === "google" ? "transparent" : colors.paper,
                    border:
                      item.source === "google"
                        ? `1px dashed ${colors.line}`
                        : `1px solid ${colors.lineSoft}`,
                  }}
                >
                  <div style={{ display: "flex", gap: 8, minWidth: 0 }}>
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: 99,
                        marginTop: 5,
                        background:
                          item.source === "google"
                            ? colors.muted
                            : item.kind === "event"
                              ? colors.moss
                              : colors.apricot,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{item.title}</div>
                      <div style={{ color: colors.muted, fontSize: 12 }}>
                        {item.source === "google" ? "Google" : item.kind} ·{" "}
                        {formatTime(item.when) || formatWhen(item.when)}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {item.kind === "task" ? (
                      <Button variant="ghost" onClick={() => void completeTask(item.id)}>
                        Done
                      </Button>
                    ) : null}
                    {item.source === "google" ? null : (
                      <Button variant="ghost" onClick={() => void removeItem(item)}>
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyHint>Nothing on this day yet. Ask LifeOS to add something.</EmptyHint>
          )}
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateRows: "auto 1fr auto",
          minHeight: 0,
          background: "rgba(251,247,240,0.72)",
          border: `1px solid ${colors.lineSoft}`,
          borderRadius: 16,
          padding: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <Companion size={32} />
          <div>
            <div style={{ fontFamily: fonts.display, fontSize: 18, fontWeight: 650 }}>Talk with LifeOS</div>
            <div style={{ color: colors.muted, fontSize: 12 }}>
              Add, update, or remove anything on your month.
            </div>
          </div>
        </div>

        <div
          className="chat-scroll"
          style={{ overflow: "auto", display: "flex", flexDirection: "column", gap: 8, paddingRight: 2 }}
        >
          {!messages.length ? (
            <div className="fade-in" style={{ margin: "auto", textAlign: "center", maxWidth: 280 }}>
              <Companion size={48} />
              <p style={{ fontFamily: fonts.display, fontSize: 18, margin: "10px 0 4px" }}>Say anything</p>
              <EmptyHint>Events and tasks land on the month calendar — click a day to review.</EmptyHint>
            </div>
          ) : null}
          {messages.map((m) => (
            <div
              key={m.id}
              className="fade-in"
              style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "88%",
                background: m.role === "user" ? colors.apricotSoft : colors.paper,
                border: `1px solid ${colors.lineSoft}`,
                borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                padding: "9px 11px",
                lineHeight: 1.4,
                fontSize: 13.5,
              }}
            >
              <div>{m.content}</div>
              {m.actions?.map((a, idx) =>
                a.undone ? null : (
                  <button
                    key={`${m.id}-${idx}`}
                    className="soft-btn"
                    style={{
                      marginTop: 8,
                      border: "none",
                      background: colors.mossSoft,
                      borderRadius: radii.pill,
                      padding: "5px 10px",
                      cursor: "pointer",
                      fontWeight: 650,
                      fontSize: 12,
                    }}
                    onClick={() => void undo(m.id, idx)}
                  >
                    {a.summary} · Undo
                  </button>
                )
              )}
            </div>
          ))}
          {sending ? (
            <div style={{ color: colors.muted, fontSize: 12, paddingLeft: 2 }}>LifeOS is thinking…</div>
          ) : null}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={send} style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Talk to LifeOS…"
            style={{
              flex: 1,
              borderRadius: radii.pill,
              border: `1px solid ${colors.line}`,
              padding: "10px 14px",
              background: colors.paper,
              outline: "none",
              fontSize: 13.5,
            }}
          />
          <Button type="submit" disabled={sending}>
            Send
          </Button>
        </form>
        {error ? <p style={{ color: colors.danger, margin: "6px 0 0", fontSize: 12 }}>{error}</p> : null}
      </section>
    </div>
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
    <div className="fade-up" style={{ maxWidth: 460 }}>
      <h1
        style={{
          margin: "0 0 4px",
          fontFamily: fonts.display,
          fontSize: 26,
          fontWeight: 650,
        }}
      >
        Settings
      </h1>
      <p style={{ margin: "0 0 16px", color: colors.muted, fontSize: 13 }}>Keep LifeOS feeling like yours.</p>

      <div
        style={{
          background: colors.paper,
          borderRadius: 12,
          padding: 12,
          border: `1px solid ${colors.lineSoft}`,
          marginBottom: 14,
          fontSize: 13,
        }}
      >
        <div style={{ fontWeight: 700 }}>{user?.email}</div>
        <div style={{ color: colors.muted, marginTop: 3 }}>Credits: {user?.credit_balance}</div>
        <div style={{ color: colors.muted }}>BYOK: {user?.has_byok_key ? "saved" : "not set"}</div>
      </div>

      <div
        style={{
          background: colors.paper,
          borderRadius: 12,
          padding: 12,
          border: `1px solid ${colors.lineSoft}`,
          marginBottom: 14,
        }}
      >
        <div style={{ fontWeight: 650, fontSize: 14, marginBottom: 4 }}>Google Calendar</div>
        <p style={{ margin: "0 0 10px", color: colors.muted, fontSize: 12 }}>
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

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <Button variant={mode === "hosted" ? "primary" : "ghost"} onClick={() => setMode("hosted")}>
          LifeOS API
        </Button>
        <Button variant={mode === "byok" ? "primary" : "ghost"} onClick={() => setMode("byok")}>
          My Gemini key
        </Button>
      </div>

      {mode === "byok" ? (
        <Field
          label="Gemini API key"
          value={key}
          onChange={setKey}
          placeholder={user?.has_byok_key ? "•••• keep existing" : "AIza…"}
        />
      ) : (
        <Button variant="ghost" onClick={buy}>
          Buy credits
        </Button>
      )}

      <div style={{ height: 12 }} />
      <Field label="Remind minutes before" value={remindBefore} onChange={setRemindBefore} />
      <div style={{ height: 12 }} />
      <Button onClick={save}>Save</Button>
      {msg ? <p style={{ color: colors.muted, fontSize: 13 }}>{msg}</p> : null}
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
