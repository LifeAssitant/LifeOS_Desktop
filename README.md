# LifeOS Desktop

Electron + React + Vite client with system tray, native notifications, Google sign-in, and Google Calendar sync.

## Setup

```bash
cp .env.example .env
# Set VITE_API_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY

npm install
npm run dev
```

### Env

| Variable | Purpose |
|----------|---------|
| `VITE_API_URL` | Backend API, default `http://localhost:8000/api/v1` |
| `VITE_SUPABASE_URL` | Supabase project URL (Google OAuth) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |

In Supabase Auth → URL configuration, allow redirect `lifeos://auth/callback`.  
Enable the Google provider with the same OAuth client used by the backend.

The Electron shell registers the `lifeos://` protocol for Google auth and calendar-connect callbacks.

Keep the backend reminder worker running for server-pushed nudges:

```bash
# LifeOS/
python -m app.workers.reminder_worker
```

The desktop app also schedules local reminders for due tasks/events while open, and polls pending desktop notifications every few seconds.

Minimize the window to keep LifeOS in the tray.

### Auth UX

- **Continue with Google** on Sign in / Create account (Supabase OAuth → LifeOS JWT)
- Email + password still available
- **Settings → Google Calendar** — connect / sync / disconnect; Google events show as quiet dashed rows on the month day list
