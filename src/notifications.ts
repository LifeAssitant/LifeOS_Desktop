import { useEffect } from "react";

import { api, getAccessToken } from "./api";

declare global {
  interface Window {
    lifeosDesktop?: {
      notify: (title: string, body: string) => Promise<boolean>;
      getDesktopToken: () => Promise<string>;
    };
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

    const tick = async () => {
      if (cancelled) return;
      try {
        const pending = await api.pendingDesktop();
        for (const n of pending) {
          if (window.lifeosDesktop) {
            await window.lifeosDesktop.notify(n.title, n.body);
          } else if ("Notification" in window && Notification.permission === "granted") {
            new Notification(n.title, { body: n.body });
          }
        }
      } catch {
        // offline — ignore
      }
    };

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => undefined);
    }

    tick();
    const id = window.setInterval(tick, 20000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [enabled]);
}
