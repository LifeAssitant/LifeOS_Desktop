import { FormEvent, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { api, ChatMessage, EventItem, Task } from "../api";
import { useAuth } from "../auth";
import { useDesktopNotifications } from "../notifications";
import { Button, Card, Companion, Field, Shell } from "../ui";
import { colors } from "../theme";

function Layout() {
  const { user, logout, offlineHint } = useAuth();
  useDesktopNotifications(Boolean(user));

  return (
    <Shell>
      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", minHeight: "100vh" }}>
        <aside
          style={{
            padding: 20,
            borderRight: `1px solid ${colors.line}`,
            background: colors.bgSoft,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Companion size={40} />
            <div>
              <div style={{ fontWeight: 800, fontSize: 20 }}>LifeOS</div>
              <div style={{ color: colors.muted, fontSize: 12 }}>{user?.email}</div>
            </div>
          </div>
          {[
            ["/", "Home"],
            ["/calendar", "Calendar"],
            ["/tasks", "Tasks"],
            ["/settings", "Settings"],
          ].map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              style={({ isActive }) => ({
                textDecoration: "none",
                color: colors.ink,
                fontWeight: isActive ? 700 : 500,
                background: isActive ? colors.peachSoft : "transparent",
                padding: "10px 12px",
                borderRadius: 12,
              })}
            >
              {label}
            </NavLink>
          ))}
          <div style={{ flex: 1 }} />
          {offlineHint ? <div style={{ color: colors.peach, fontSize: 13 }}>{offlineHint}</div> : null}
          <Button variant="ghost" onClick={logout}>
            Sign out
          </Button>
        </aside>
        <main style={{ padding: 24 }}>
          <Outlet />
        </main>
      </div>
    </Shell>
  );
}

export function HomePage() {
  const { setOfflineHint } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const [today, history] = await Promise.all([api.today(), api.chatHistory()]);
      setTasks(today.tasks);
      setEvents(today.events);
      setMessages(history);
      setOfflineHint(null);
    } catch {
      setOfflineHint("We’ll sync when you’re back.");
    }
  }, [setOfflineHint]);

  useEffect(() => {
    load();
  }, [load]);

  const send = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || sending) return;
    setSending(true);
    const text = draft.trim();
    setDraft("");
    try {
      const reply = await api.chatSend(text);
      setMessages((prev) => [
        ...prev,
        { id: `u-${Date.now()}`, role: "user", content: text, created_at: new Date().toISOString() },
        reply,
      ]);
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Chat failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateRows: "auto auto 1fr auto", height: "calc(100vh - 48px)", gap: 12 }}>
      <div>
        <h1 style={{ margin: 0 }}>Today</h1>
        <p style={{ color: colors.muted, marginTop: 4 }}>
          {tasks.length} open tasks · {events.length} events
        </p>
      </div>
      <Card style={{ background: colors.mintSoft }}>
        {tasks.slice(0, 4).map((t) => (
          <div key={t.id}>· {t.title}</div>
        ))}
        {!tasks.length ? <span style={{ color: colors.muted }}>Nothing yet — chat below.</span> : null}
      </Card>
      <div style={{ overflow: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "75%",
              background: m.role === "user" ? colors.peachSoft : colors.card,
              border: `1px solid ${colors.line}`,
              borderRadius: 16,
              padding: 12,
            }}
          >
            <div>{m.content}</div>
            {m.actions?.map((a, idx) =>
              a.undone ? null : (
                <button
                  key={`${m.id}-${idx}`}
                  style={{
                    marginTop: 8,
                    border: "none",
                    background: colors.mintSoft,
                    borderRadius: 999,
                    padding: "6px 10px",
                    cursor: "pointer",
                  }}
                  onClick={() => api.chatUndo(m.id, idx).then(load)}
                >
                  {a.summary} · Undo
                </button>
              )
            )}
          </div>
        ))}
      </div>
      <form onSubmit={send} style={{ display: "flex", gap: 8 }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Talk to LifeOS…"
          style={{
            flex: 1,
            borderRadius: 999,
            border: `1px solid ${colors.line}`,
            padding: "12px 16px",
            background: colors.card,
          }}
        />
        <Button type="submit" disabled={sending}>
          Send
        </Button>
      </form>
    </div>
  );
}

export function CalendarPage() {
  const [cursor, setCursor] = useState(() => new Date());
  const [events, setEvents] = useState<EventItem[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    const from = new Date(cursor.getFullYear(), cursor.getMonth(), 1).toISOString();
    const to = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59).toISOString();
    Promise.all([api.events(from, to), api.tasks("open")])
      .then(([ev, tk]) => {
        setEvents(ev);
        setTasks(tk.filter((t) => t.due_at && t.due_at >= from && t.due_at <= to));
      })
      .catch(() => undefined);
  }, [cursor]);

  const items = useMemo(() => {
    return [
      ...events.map((e) => ({ id: e.id, title: e.title, when: e.start_at, kind: "event" })),
      ...tasks.map((t) => ({ id: t.id, title: t.title, when: t.due_at!, kind: "task" })),
    ].sort((a, b) => a.when.localeCompare(b.when));
  }, [events, tasks]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Calendar</h1>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Button variant="ghost" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
            ‹
          </Button>
          <strong>
            {cursor.toLocaleString(undefined, { month: "long", year: "numeric" })}
          </strong>
          <Button variant="ghost" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
            ›
          </Button>
        </div>
      </div>
      <div style={{ display: "grid", gap: 8, marginTop: 16 }}>
        {items.map((item) => (
          <Card key={`${item.kind}-${item.id}`}>
            <strong>{item.title}</strong>
            <div style={{ color: colors.muted, fontSize: 13 }}>
              {item.kind} · {new Date(item.when).toLocaleString()}
            </div>
          </Card>
        ))}
        {!items.length ? <p style={{ color: colors.muted }}>Quiet month.</p> : null}
      </div>
    </div>
  );
}

export function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");

  const load = () => api.tasks("open").then(setTasks).catch(() => undefined);
  useEffect(() => {
    load();
  }, []);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const due = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await api.createTask({ title: title.trim(), due_at: due });
    setTitle("");
    await load();
  };

  return (
    <div>
      <h1>Tasks</h1>
      <form onSubmit={add} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Something small…"
          style={{
            flex: 1,
            borderRadius: 14,
            border: `1px solid ${colors.line}`,
            padding: "10px 12px",
          }}
        />
        <Button type="submit">Add</Button>
      </form>
      <div style={{ display: "grid", gap: 8 }}>
        {tasks.map((t) => (
          <Card key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong>{t.title}</strong>
              <div style={{ color: colors.muted, fontSize: 13 }}>
                {t.due_at ? new Date(t.due_at).toLocaleString() : "No due time"}
              </div>
            </div>
            <Button variant="ghost" onClick={() => api.completeTask(t.id).then(load)}>
              Done
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const [mode, setMode] = useState<"hosted" | "byok">(user?.ai_mode ?? "hosted");
  const [key, setKey] = useState("");
  const [remindBefore, setRemindBefore] = useState(String(user?.remind_before_minutes ?? 15));
  const [msg, setMsg] = useState("");

  const save = async () => {
    try {
      await api.updateAi({
        ai_mode: mode,
        gemini_api_key: mode === "byok" ? key || undefined : undefined,
      });
      await api.updateMe({ remind_before_minutes: Number(remindBefore) || 15 });
      await refreshUser();
      setKey("");
      setMsg("Saved");
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

  return (
    <div style={{ maxWidth: 480 }}>
      <h1>Settings</h1>
      <Card style={{ marginBottom: 16 }}>
        <div>{user?.email}</div>
        <div style={{ color: colors.muted }}>Credits: {user?.credit_balance}</div>
        <div style={{ color: colors.muted }}>BYOK: {user?.has_byok_key ? "saved" : "not set"}</div>
      </Card>
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
      {msg ? <p style={{ color: colors.muted }}>{msg}</p> : null}
    </div>
  );
}

export function AppLayout() {
  return <Layout />;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) navigate("/login");
    else if (!user.onboarding_completed) navigate("/onboarding");
  }, [user, loading, navigate]);

  if (loading || !user) return <Shell><div style={{ padding: 40 }}>Loading…</div></Shell>;
  return <>{children}</>;
}
