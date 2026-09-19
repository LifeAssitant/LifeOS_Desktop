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
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";

import { api, ChatMessage } from "../api";
import { useAuth } from "../auth";
import { LifeDataProvider, useLifeData } from "../data";
import { Markdown } from "../markdown";
import { useDesktopNotifications } from "../notifications";
import { colors } from "../theme";
import { Tour, requestTour } from "../tour";
import { AccountMenu, Button, Companion, EmptyHint, Field, Shell } from "../ui";
import {
  getSpeakReplies,
  isSpeaking,
  setSpeakReplies,
  speakReply,
  startVoiceListen,
  stopSpeaking,
  stopVoiceListen,
  type VoiceStatus,
} from "../voice";

type PlanChrome = { count: number; open: boolean; onToggle: () => void };

type PlanChromeValue = {
  setPlanChrome: (next: PlanChrome | null) => void;
};

const PlanChromeContext = createContext<PlanChromeValue | null>(null);

function usePlanChrome() {
  const ctx = useContext(PlanChromeContext);
  if (!ctx) throw new Error("usePlanChrome requires provider");
  return ctx;
}

function greeting(date: Date) {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function Layout() {
  const { user, logout, offlineHint } = useAuth();
  const location = useLocation();
  useDesktopNotifications(Boolean(user));
  const [planChrome, setPlanChromeState] = useState<PlanChrome | null>(null);

  const setPlanChrome = useCallback((next: PlanChrome | null) => {
    setPlanChromeState(next);
  }, []);

  const chromeValue = useMemo(() => ({ setPlanChrome }), [setPlanChrome]);

  const onSettings = location.pathname.startsWith("/settings");
  const firstName = (user?.display_name || user?.email || "").split(/[\s@]/)[0];
  const today = new Date();

  return (
    <PlanChromeContext.Provider value={chromeValue}>
      <Shell>
        <div className="app-frame">
          <header className="app-topbar">
            <div className="topbar-left">
              <Link to="/" className="topbar-brand" aria-label="LifeOS home">
                <Companion size={38} />
              </Link>
              <div className="topbar-greeting">
                <h1>
                  {onSettings
                    ? "Settings"
                    : firstName
                      ? `${greeting(today)}, ${firstName}`
                      : greeting(today)}
                </h1>
                <p>
                  {onSettings
                    ? "Calendar, reminders and AI"
                    : today.toLocaleDateString(undefined, {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })}
                </p>
              </div>
            </div>

            <div className="app-topbar-right">
              {offlineHint ? <span className="app-offline">{offlineHint}</span> : null}
              {typeof window.lifeosDesktop?.enterMini === "function" ? (
                <button
                  type="button"
                  className="pill-btn"
                  data-tour="mini"
                  title="Shrink to a corner widget"
                  onClick={() => void window.lifeosDesktop?.enterMini()}
                >
                  <MiniIcon />
                  Mini
                </button>
              ) : null}
              {planChrome ? (
                <button
                  type="button"
                  className={`pill-btn${planChrome.open ? " is-active" : ""}`}
                  data-tour="plan"
                  onClick={planChrome.onToggle}
                >
                  <CalendarIcon />
                  {planChrome.open
                    ? "Hide plan"
                    : planChrome.count
                      ? `Plan · ${planChrome.count}`
                      : "Plan"}
                </button>
              ) : null}
              <AccountMenu name={user?.display_name} email={user?.email} onLogout={logout} />
            </div>
          </header>

          <main className="app-main fade-in">
            <Outlet />
          </main>
        </div>
        <Tour />
      </Shell>
    </PlanChromeContext.Provider>
  );
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseLocalDay(iso: string) {
  return dayKey(new Date(iso));
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

const SUGGESTIONS: Array<{
  tone: "mint" | "peach" | "sky" | "lilac";
  title: string;
  hint: string;
  prompt: string;
  icon: ReactNode;
}> = [
  {
    tone: "mint",
    title: "Shape my day",
    hint: "Block time around what is already fixed",
    prompt: "Plan the rest of my day around what I already have scheduled.",
    icon: <SparkIcon />,
  },
  {
    tone: "peach",
    title: "Add something",
    hint: "A task or event in one sentence",
    prompt: "Groceries after work tomorrow, remind me at 6pm.",
    icon: <PlusIcon />,
  },
  {
    tone: "sky",
    title: "What is next",
    hint: "The next few things coming up",
    prompt: "What's coming up for me today?",
    icon: <ClockIcon />,
  },
  {
    tone: "lilac",
    title: "Make room",
    hint: "Move or drop what can wait",
    prompt: "Clear my evening — move anything that can wait to tomorrow.",
    icon: <BroomIcon />,
  },
];

export function HomePage() {
  const { setOfflineHint } = useAuth();
  const { setPlanChrome } = usePlanChrome();
  const { tasks, events, refreshAll, completeTask, deleteEvent, deleteTask } = useLifeData();
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState(() => dayKey(new Date()));
  const [planOpen, setPlanOpen] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [voice, setVoice] = useState<VoiceStatus>("idle");
  const [speaking, setSpeaking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sendingRef = useRef(false);
  const voiceRef = useRef<VoiceStatus>("idle");

  useEffect(() => {
    voiceRef.current = voice;
  }, [voice]);

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
    const startPad = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<{ key: string; day: number | null; inMonth: boolean }> = [];
    for (let i = 0; i < startPad; i++) cells.push({ key: `pad-${i}`, day: null, inMonth: false });
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ key: dayKey(new Date(year, month, d)), day: d, inMonth: true });
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
  }, [messages, sending, voice]);

  const sendText = async (raw: string, fromVoice = false) => {
    const text = raw.trim();
    if (!text || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    setError("");
    setDraft("");
    stopSpeaking();
    setSpeaking(false);
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

      if (fromVoice) {
        speakReply(reply.content);
        setSpeaking(true);
        window.setTimeout(() => {
          if (!isSpeaking()) setSpeaking(false);
        }, Math.min(12000, Math.max(1800, reply.content.length * 45)));
      }

      const entityId =
        reply.linked_entity_ids?.[0] ||
        reply.actions?.find((a) => a.entity_id && !a.undone)?.entity_id;
      if (entityId) {
        const [freshTasks, freshEvents] = await Promise.all([
          api.tasks("open"),
          api.events(
            new Date(cursor.getFullYear(), cursor.getMonth(), 1).toISOString(),
            new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59).toISOString()
          ),
        ]);
        const matchEvent = freshEvents.find((ev) => ev.id === entityId);
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
      sendingRef.current = false;
      setSending(false);
    }
  };

  const send = async (e: FormEvent) => {
    e.preventDefault();
    await sendText(draft);
  };

  const finishVoice = async () => {
    if (voiceRef.current !== "listening") return;
    const fromBox = draft.trim();
    setVoice("transcribing");
    try {
      const fromEngine = await stopVoiceListen();
      setVoice("idle");
      const text = (fromBox || fromEngine).trim();
      if (!text) {
        setError("I couldn't hear anything. Tap the mic, speak, then tap again to send.");
        return;
      }
      setDraft(text);
      await sendText(text, true);
    } catch (err) {
      setVoice("idle");
      setError(err instanceof Error ? err.message : "Voice didn't come through");
    }
  };

  const beginVoice = async () => {
    if (sendingRef.current || voiceRef.current !== "idle") return;
    setError("");
    setDraft("");
    try {
      await startVoiceListen((partial) => setDraft(partial));
      setVoice("listening");
    } catch (err) {
      setVoice("idle");
      const message = err instanceof Error ? err.message : "Microphone is blocked";
      setError(
        message.toLowerCase().includes("denied") || message.toLowerCase().includes("not allowed")
          ? "Allow the microphone to talk to LifeOS."
          : message
      );
    }
  };

  const onMicClick = () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
    }
    if (voiceRef.current === "listening") {
      void finishVoice();
      return;
    }
    if (voiceRef.current === "idle") void beginVoice();
  };

  useEffect(() => {
    return () => {
      void stopVoiceListen(true);
      stopSpeaking();
    };
  }, []);

  const undo = async (messageId: string, index: number) => {
    await api.chatUndo(messageId, index);
    await Promise.all([refreshAll(), loadChat()]);
  };

  const removeItem = async (item: DayItem) => {
    if (item.source === "google") return;
    if (item.kind === "event") await deleteEvent(item.id);
    else await deleteTask(item.id);
  };

  const applySuggestion = (prompt: string) => {
    setDraft(prompt);
    inputRef.current?.focus();
  };

  const togglePlan = useCallback(() => setPlanOpen((v) => !v), []);

  useEffect(() => {
    setPlanChrome({ count: selectedItems.length, open: planOpen, onToggle: togglePlan });
    return () => setPlanChrome(null);
  }, [selectedItems.length, planOpen, togglePlan, setPlanChrome]);

  return (
    <div className={`workspace${planOpen ? " has-plan" : ""}`}>
      <section className="chat-panel">
        <div className="chat-stream">
          {!messages.length ? (
            <div className="chat-welcome fade-in">
              <h2 className="chat-welcome-title">What should today look like?</h2>
              <p className="chat-welcome-sub">
                Describe it the way you would to a friend. LifeOS writes the tasks, books the time
                and sets the reminders.
              </p>
              <div className="suggestion-grid" data-tour="suggestions">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.title}
                    type="button"
                    className={`suggestion suggestion-tone-${s.tone}`}
                    onClick={() => applySuggestion(s.prompt)}
                  >
                    <span className="suggestion-icon">{s.icon}</span>
                    <strong>{s.title}</strong>
                    <span>{s.hint}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {messages.map((m) => (
            <div
              key={m.id}
              className={`chat-bubble ${m.role === "user" ? "is-user" : "is-assistant"}`}
            >
              {m.role === "user" ? (
                <div className="md-plain">{m.content}</div>
              ) : (
                <>
                  <Markdown text={m.content} />
                  <button
                    type="button"
                    className={`chat-speak${speaking ? " is-on" : ""}`}
                    aria-label={speaking ? "Stop speaking" : "Listen to this reply"}
                    title={speaking ? "Stop" : "Listen"}
                    onClick={() => {
                      if (isSpeaking()) {
                        stopSpeaking();
                        setSpeaking(false);
                        return;
                      }
                      speakReply(m.content);
                      setSpeaking(true);
                    }}
                  >
                    <SpeakerIcon />
                  </button>
                </>
              )}
              {m.actions?.some((a) => !a.undone) ? (
                <div className="chat-actions">
                  {m.actions.map((a, idx) =>
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
              ) : null}
            </div>
          ))}

          {voice === "listening" ? (
            <div className="chat-bubble is-user is-live">
              <div className="md-plain">
                {draft.trim() ? draft : "Listening…"}
                <span className="live-caret" aria-hidden>
                  |
                </span>
              </div>
            </div>
          ) : null}

          {sending || voice === "transcribing" ? (
            <div className="chat-thinking fade-in">
              <i />
              {voice === "transcribing" ? "Hearing you" : "Working on it"}
            </div>
          ) : voice === "listening" ? (
            <div className="chat-thinking fade-in is-listen">
              <i />
              Listening — click the mic again to send
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>

        <div>
          <form onSubmit={send} className={`composer${voice === "listening" ? " is-listening" : ""}`} data-tour="composer">
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={voice === "listening" ? "Words appear as you speak…" : "Talk to LifeOS…"}
              aria-label="Message LifeOS"
              disabled={voice === "transcribing" || sending}
            />
            <button
              type="button"
              className={`composer-mic${voice === "listening" ? " is-live" : ""}`}
              aria-label={voice === "listening" ? "Stop and send" : "Talk"}
              title={voice === "listening" ? "Click to send" : "Click to talk"}
              disabled={sending || voice === "transcribing"}
              onClick={onMicClick}
            >
              <MicIcon />
            </button>
            <button
              type="submit"
              className="composer-send"
              disabled={sending || !draft.trim() || voice !== "idle"}
              aria-label="Send message"
            >
              <SendIcon />
            </button>
          </form>
          {error ? <p className="chat-error">{error}</p> : null}
        </div>
      </section>

      {planOpen ? (
        <aside className="plan-dock" aria-label="Your plan">
          <div className="plan-head">
            <h2 className="plan-month">
              {cursor.toLocaleString(undefined, { month: "long", year: "numeric" })}
            </h2>
            <div className="plan-nav">
              <button
                type="button"
                className="plan-step"
                aria-label="Previous month"
                onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
              >
                ‹
              </button>
              <button
                type="button"
                className="plan-step"
                style={{ width: "auto", padding: "0 9px", fontSize: 11.5, fontWeight: 600 }}
                onClick={() => {
                  const now = new Date();
                  setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
                  setSelected(dayKey(now));
                }}
              >
                Today
              </button>
              <button
                type="button"
                className="plan-step"
                aria-label="Next month"
                onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
              >
                ›
              </button>
            </div>
          </div>

          <div className="cal-weekdays">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
              <div key={`${d}-${i}`}>{d}</div>
            ))}
          </div>

          <div className="cal-grid">
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
                  className={`day-cell${isSelected ? " is-selected" : ""}${isToday ? " is-today" : ""}`}
                  onClick={() => setSelected(cell.key)}
                >
                  <span className="day-num">{cell.day}</span>
                  <span className="day-dots">
                    {count > 0 ? (
                      <>
                        <span style={{ background: colors.accent }} />
                        {count > 1 ? <span style={{ background: colors.muted }} /> : null}
                      </>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="plan-day">
            <div className="plan-day-label">{selectedLabel}</div>
            {selectedItems.length ? (
              <div className="day-list">
                {selectedItems.map((item, index) => (
                  <div
                    key={`${item.kind}-${item.id}`}
                    className="day-row"
                    style={{ animationDelay: `${index * 35}ms` }}
                  >
                    <span
                      className="day-row-dot"
                      style={{
                        background:
                          item.source === "google"
                            ? colors.muted
                            : item.kind === "event"
                              ? colors.accent
                              : colors.mint,
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
              <EmptyHint>Nothing here yet. Ask LifeOS to add something to this day.</EmptyHint>
            )}
          </div>
        </aside>
      ) : null}
    </div>
  );
}

function MiniIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="4" width="18" height="16" rx="3.5" stroke="currentColor" strokeWidth="1.6" />
      <rect x="12" y="13" width="7" height="5" rx="1.6" fill="currentColor" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="3.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3 10h18" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 12h13M12 5.5 18.5 12 12 18.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="9" y="3.5" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M6.5 11.5a5.5 5.5 0 0 0 11 0M12 17v3.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SpeakerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4.5 9.5v5h3.2L12.5 18V6L7.7 9.5H4.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M16 9.2a4 4 0 0 1 0 5.6M18.4 7a7 7 0 0 1 0 10"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3.5 13.9 9l5.6 1.9-5.6 1.9L12 18.5 10.1 12.8 4.5 10.9 10.1 9 12 3.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function BroomIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M15 4 9.5 9.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M6 12.5 11.5 7l5.5 5.5-2.2 6.2a2 2 0 0 1-1.9 1.3H8.8a2 2 0 0 1-1.9-1.4L6 12.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const { refreshAll } = useLifeData();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"hosted" | "byok">(user?.ai_mode ?? "hosted");
  const [key, setKey] = useState("");
  const [remindBefore, setRemindBefore] = useState(String(user?.remind_before_minutes ?? 15));
  const [msg, setMsg] = useState("");
  const [calendarConnected, setCalendarConnected] = useState(
    Boolean(user?.google_calendar_connected)
  );
  const [calendarBusy, setCalendarBusy] = useState(false);
  const [speakReplies, setSpeakRepliesOn] = useState(() => getSpeakReplies());

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
    <div className="settings-page fade-up">
      <div className="settings-inner">
        <div className="settings-block">
          <div className="settings-block-title">{user?.email}</div>
          <p className="settings-note" style={{ marginBottom: 0 }}>
            {user?.credit_balance} credits · Gemini key {user?.has_byok_key ? "saved" : "not set"}
          </p>
        </div>

        <div className="settings-block">
          <div className="settings-block-title">Google Calendar</div>
          <p className="settings-note">
            {calendarConnected
              ? "Your Google events show up on the month view. LifeOS never edits them."
              : "Connect once — LifeOS reads your primary calendar and makes no changes."}
          </p>
          <div className="settings-row">
            {calendarConnected ? (
              <>
                <Button variant="ghost" disabled={calendarBusy} onClick={() => void syncCalendar()}>
                  Sync now
                </Button>
                <Button
                  variant="ghost"
                  disabled={calendarBusy}
                  onClick={() => void disconnectCalendar()}
                >
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
          <div className="settings-block-title">Voice</div>
          <p className="settings-note">
            Click the mic to talk. After you do, LifeOS can read its reply out loud.
          </p>
          <div className="segmented">
            <button
              type="button"
              className={speakReplies ? "is-active" : undefined}
              onClick={() => {
                setSpeakReplies(true);
                setSpeakRepliesOn(true);
              }}
            >
              Speak replies
            </button>
            <button
              type="button"
              className={!speakReplies ? "is-active" : undefined}
              onClick={() => {
                setSpeakReplies(false);
                setSpeakRepliesOn(false);
                stopSpeaking();
              }}
            >
              Text only
            </button>
          </div>
        </div>

        <div className="settings-block">
          <div className="settings-block-title">AI</div>
          <p className="settings-note">
            Use LifeOS credits, or bring your own Gemini key and skip them entirely.
          </p>
          <div className="segmented">
            <button
              type="button"
              className={mode === "hosted" ? "is-active" : undefined}
              onClick={() => setMode("hosted")}
            >
              LifeOS credits
            </button>
            <button
              type="button"
              className={mode === "byok" ? "is-active" : undefined}
              onClick={() => setMode("byok")}
            >
              My Gemini key
            </button>
          </div>
          {mode === "byok" ? (
            <Field
              label="Gemini API key"
              value={key}
              onChange={setKey}
              type="password"
              placeholder="AIza…"
            />
          ) : null}
        </div>

        <div className="settings-block">
          <div className="settings-block-title">Reminders</div>
          <p className="settings-note">How early should a nudge arrive before something starts?</p>
          <Field
            label="Remind me before (minutes)"
            value={remindBefore}
            onChange={setRemindBefore}
            type="number"
          />
        </div>

        <div className="settings-block">
          <div className="settings-block-title">Walkthrough</div>
          <p className="settings-note">Replay the short tour of the app.</p>
          <Button
            variant="ghost"
            onClick={() => {
              requestTour();
              navigate("/");
            }}
          >
            Show me around again
          </Button>
        </div>

        <div className="settings-row" style={{ paddingBottom: 4 }}>
          <Button onClick={save}>Save changes</Button>
          <Button variant="ghost" onClick={() => void buy()}>
            Buy credits
          </Button>
          {msg ? (
            <span style={{ alignSelf: "center", color: colors.muted, fontSize: 13 }}>{msg}</span>
          ) : null}
        </div>
      </div>
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
        <div style={{ display: "grid", placeItems: "center", height: "100%", color: colors.muted }}>
          Opening LifeOS…
        </div>
      </Shell>
    );
  }
  return <>{children}</>;
}
