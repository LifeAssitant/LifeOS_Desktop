const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

const ACCESS_KEY = "lifeos_access";
const REFRESH_KEY = "lifeos_refresh";

export type TokenPair = { access_token: string; refresh_token: string };

export function saveTokens(tokens: TokenPair) {
  localStorage.setItem(ACCESS_KEY, tokens.access_token);
  localStorage.setItem(REFRESH_KEY, tokens.refresh_token);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY);
}

async function refreshAccess(): Promise<string | null> {
  const refresh = localStorage.getItem(REFRESH_KEY);
  if (!refresh) return null;
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refresh }),
  });
  if (!res.ok) {
    clearTokens();
    return null;
  }
  const data = (await res.json()) as TokenPair;
  saveTokens(data);
  return data.access_token;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  auth = true
): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");

  if (auth) {
    let token = getAccessToken();
    if (!token) throw new ApiError(401, "Not authenticated");
    headers.set("Authorization", `Bearer ${token}`);
    let res = await fetch(`${API_URL}${path}`, { ...options, headers });
    if (res.status === 401) {
      token = await refreshAccess();
      if (!token) throw new ApiError(401, "Session expired");
      headers.set("Authorization", `Bearer ${token}`);
      res = await fetch(`${API_URL}${path}`, { ...options, headers });
    }
    return parse<T>(res);
  }

  return parse<T>(await fetch(`${API_URL}${path}`, { ...options, headers }));
}

async function parse<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    data = {};
  }
  if (!res.ok) {
    throw new ApiError(res.status, formatDetail(data.detail) || res.statusText || "Request failed");
  }
  return data as T;
}

function formatDetail(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          const row = item as { loc?: unknown[]; msg?: string };
          const field = Array.isArray(row.loc)
            ? row.loc.filter((p) => p !== "body").join(".")
            : "";
          const msg = row.msg || "Invalid value";
          return field ? `${field}: ${msg}` : msg;
        }
        return String(item);
      })
      .filter(Boolean)
      .join(" · ");
  }
  if (detail && typeof detail === "object") return JSON.stringify(detail);
  return "";
}


export type User = {
  id: string;
  email: string;
  display_name: string | null;
  onboarding_completed: boolean;
  ai_mode: "hosted" | "byok";
  credit_balance: number;
  has_byok_key: boolean;
  remind_before_minutes: number;
  quiet_hours_enabled: boolean;
};

export type Task = {
  id: string;
  title: string;
  notes: string | null;
  due_at: string | null;
  status: "open" | "done";
};

export type EventItem = {
  id: string;
  title: string;
  start_at: string;
  end_at: string | null;
  location: string | null;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  actions?: Array<{ type: string; summary: string; entity_id?: string; undone?: boolean }> | null;
  created_at: string;
};

export type NotificationItem = {
  id: string;
  kind: string;
  title: string;
  body: string;
  created_at: string;
};

export const api = {
  register: (email: string, password: string, display_name?: string) =>
    apiFetch<TokenPair>(
      "/auth/register",
      { method: "POST", body: JSON.stringify({ email, password, display_name }) },
      false
    ),
  login: (email: string, password: string) =>
    apiFetch<TokenPair>(
      "/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) },
      false
    ),
  me: () => apiFetch<User>("/me"),
  updateMe: (body: Record<string, unknown>) =>
    apiFetch<User>("/me", { method: "PATCH", body: JSON.stringify(body) }),
  updateAi: (body: { ai_mode: "hosted" | "byok"; gemini_api_key?: string }) =>
    apiFetch<User>("/me/ai", { method: "PUT", body: JSON.stringify(body) }),
  today: () => apiFetch<{ tasks: Task[]; events: EventItem[] }>("/today"),
  tasks: (status?: string) =>
    apiFetch<Task[]>(status ? `/tasks?status=${status}` : "/tasks"),
  createTask: (body: { title: string; due_at?: string }) =>
    apiFetch<Task>("/tasks", { method: "POST", body: JSON.stringify(body) }),
  completeTask: (id: string) =>
    apiFetch<Task>(`/tasks/${id}/complete`, { method: "POST" }),
  events: (from?: string, to?: string) => {
    const q = new URLSearchParams();
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    const qs = q.toString();
    return apiFetch<EventItem[]>(`/events${qs ? `?${qs}` : ""}`);
  },
  chatHistory: () => apiFetch<ChatMessage[]>("/chat/messages"),
  chatSend: (message: string) =>
    apiFetch<ChatMessage>("/chat/send", {
      method: "POST",
      body: JSON.stringify({ message }),
    }),
  chatUndo: (message_id: string, action_index = 0) =>
    apiFetch<{ ok: boolean }>("/chat/undo", {
      method: "POST",
      body: JSON.stringify({ message_id, action_index }),
    }),
  checkout: () =>
    apiFetch<{ checkout_url: string }>("/billing/checkout", { method: "POST" }),
  pendingDesktop: () =>
    apiFetch<NotificationItem[]>("/notifications/pending/desktop"),
};
