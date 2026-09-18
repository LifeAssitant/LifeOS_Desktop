import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { api, EventItem, Task, getAccessToken } from "./api";
import { useAuth } from "./auth";

type LifeData = {
  tasks: Task[];
  events: EventItem[];
  loading: boolean;
  refreshAll: () => Promise<void>;
  completeTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  addTask: (title: string, dueAt?: string) => Promise<void>;
};

const LifeDataContext = createContext<LifeData | null>(null);

declare global {
  interface Window {
    lifeosDesktop?: {
      notify: (title: string, body: string) => Promise<boolean>;
      getDesktopToken: () => Promise<string>;
    };
  }
}

function notifyLocal(title: string, body: string) {
  if (window.lifeosDesktop) {
    void window.lifeosDesktop.notify(title, body);
    return;
  }
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body });
  }
}

export function LifeDataProvider({ children }: { children: ReactNode }) {
  const { user, setOfflineHint } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const timersRef = useRef<Map<string, number>>(new Map());
  const firedRef = useRef<Set<string>>(new Set());

  const clearTimers = () => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current.clear();
  };

  const scheduleReminders = useCallback((openTasks: Task[], upcomingEvents: EventItem[]) => {
    clearTimers();
    const now = Date.now();
    const horizon = now + 24 * 60 * 60 * 1000;

    const entries: Array<{ key: string; at: number; title: string; body: string }> = [];

    for (const t of openTasks) {
      const remind = t.remind_at ? Date.parse(t.remind_at) : t.due_at ? Date.parse(t.due_at) : NaN;
      if (!Number.isFinite(remind) || remind < now - 60_000 || remind > horizon) continue;
      entries.push({
        key: `task:${t.id}:${remind}`,
        at: remind,
        title: remind < (t.due_at ? Date.parse(t.due_at) : remind) ? "Task due soon" : "Task reminder",
        body: t.title,
      });
    }

    for (const e of upcomingEvents) {
      const remind = e.remind_at ? Date.parse(e.remind_at) : Date.parse(e.start_at);
      if (!Number.isFinite(remind) || remind < now - 60_000 || remind > horizon) continue;
      entries.push({
        key: `event:${e.id}:${remind}`,
        at: remind,
        title: "Event starting soon",
        body: e.title,
      });
    }

    for (const entry of entries) {
      if (firedRef.current.has(entry.key)) continue;
      const delay = Math.max(500, entry.at - now);
      const timerId = window.setTimeout(() => {
        if (firedRef.current.has(entry.key)) return;
        firedRef.current.add(entry.key);
        notifyLocal(entry.title, entry.body);
      }, delay);
      timersRef.current.set(entry.key, timerId);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    if (!getAccessToken()) return;
    setLoading(true);
    try {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const to = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59).toISOString();
      const [openTasks, monthEvents] = await Promise.all([
        api.tasks("open"),
        api.events(from, to),
      ]);
      setTasks(openTasks);
      setEvents(monthEvents);
      scheduleReminders(openTasks, monthEvents);
      setOfflineHint(null);
    } catch {
      setOfflineHint("We’ll sync when you’re back.");
    } finally {
      setLoading(false);
    }
  }, [scheduleReminders, setOfflineHint]);

  useEffect(() => {
    if (!user) {
      setTasks([]);
      setEvents([]);
      clearTimers();
      return;
    }
    void refreshAll();
    const onFocus = () => void refreshAll();
    window.addEventListener("focus", onFocus);
    const id = window.setInterval(() => void refreshAll(), 60_000);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(id);
      clearTimers();
    };
  }, [user, refreshAll]);

  const completeTask = useCallback(
    async (id: string) => {
      await api.completeTask(id);
      await refreshAll();
    },
    [refreshAll]
  );

  const deleteTask = useCallback(
    async (id: string) => {
      await api.deleteTask(id);
      await refreshAll();
    },
    [refreshAll]
  );

  const deleteEvent = useCallback(
    async (id: string) => {
      await api.deleteEvent(id);
      await refreshAll();
    },
    [refreshAll]
  );

  const addTask = useCallback(
    async (title: string, dueAt?: string) => {
      await api.createTask({ title, due_at: dueAt });
      await refreshAll();
    },
    [refreshAll]
  );

  const value = useMemo(
    () => ({
      tasks,
      events,
      loading,
      refreshAll,
      completeTask,
      deleteTask,
      deleteEvent,
      addTask,
    }),
    [tasks, events, loading, refreshAll, completeTask, deleteTask, deleteEvent, addTask]
  );

  return <LifeDataContext.Provider value={value}>{children}</LifeDataContext.Provider>;
}

export function useLifeData() {
  const ctx = useContext(LifeDataContext);
  if (!ctx) throw new Error("useLifeData requires LifeDataProvider");
  return ctx;
}
