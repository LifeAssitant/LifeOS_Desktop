# LifeOS Desktop

Electron + React + Vite client with system tray, native notifications, Google sign-in, and Google Calendar sync.

Sign-in requires an 18+ self-declaration; LifeOS does not ask for date of birth.
Razorpay billing is implemented for web/desktop and remains disabled until the
backend credentials and matching plan are configured. The proposed India-first
offer is ₹399/month for 60 AI credits refreshed weekly, plus ₹99 for a one-time
20-credit top-up. Confirm the age policy and commercial terms with qualified
counsel/accounting support before public sales.

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
Forgot-password links open the LifeOS website; SMTP delivery must be configured
on the backend before account recovery can be used. Reset links expire after
30 minutes and resetting a password signs out existing sessions.

Keep the backend reminder worker running for server-pushed nudges:

```bash
# LifeOS/
python -m app.workers.reminder_worker
```

The desktop app also schedules local reminders for due tasks/events while open, and polls pending desktop notifications every few seconds.

Minimize the window to keep LifeOS in the tray.

### Windows release build

Set `VITE_API_URL` in `.env` to the production HTTPS API endpoint before packaging.
Production builds fail if the URL is missing or does not use HTTPS.

```bash
npm run package:win
```

The installer is written to `release/`. This build is unsigned; configure a
Windows code-signing certificate in the release environment before distributing
it publicly. Never commit signing credentials.

### Auth UX

- **Continue with Google** on Sign in / Create account (Supabase OAuth → LifeOS JWT)
- Email + password still available
- **Settings → Google Calendar** — connect / sync / disconnect; Google events show as quiet dashed rows on the month day list
