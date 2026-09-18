# LifeOS Desktop

Electron + React + Vite client with system tray and native notifications.

## Setup

```bash
npm install
# optional: set VITE_API_URL=http://localhost:8000/api/v1
npm run dev
```

Keep the backend reminder worker running for server-pushed nudges:

```bash
# LifeOS/
python -m app.workers.reminder_worker
```

The desktop app also schedules local reminders for due tasks/events while open, and polls pending desktop notifications every few seconds.

Minimize the window to keep LifeOS in the tray.
