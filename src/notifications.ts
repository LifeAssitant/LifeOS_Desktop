import { useEffect } from "react";

import { api, getAccessToken } from "./api";

async function showNotice(title: string, body: string) {
  if (window.lifeosDesktop) {
    await window.lifeosDesktop.notify(title, body);
    return;
  }
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body });
  }
}

export function useDesktopNotifications(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !getAccessToken()) return;

    let cancelled = false;

    (async () => {
      try {
        if (window.lifeosDesktop) {
          const token = await window.lifeosDesktop.getDesktopToken();
          await api.updateMe({ desktop_push_token: token });
        }
      } catch {
        // ignore
      }
    })();

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => undefined);
    }

    const tick = async () => {
      if (cancelled) return;
      try {
        const pending = await api.pendingDesktop();
        for (const n of pending) {
          await showNotice(n.title, n.body);
        }
      } catch {
        // offline — ignore
      }
    };

    tick();
    // Poll often so due reminders feel timely while the app/tray is open.
    const id = window.setInterval(tick, 8_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [enabled]);
}
