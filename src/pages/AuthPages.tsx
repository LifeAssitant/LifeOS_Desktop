import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../auth";
import { isSupabaseConfigured } from "../supabase";
import { AuthForm, Button, Field } from "../ui";
import { colors } from "../theme";

function GoogleButton({
  onClick,
  loading,
  label,
}: {
  onClick: () => void;
  loading: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        padding: "11px 14px",
        borderRadius: 12,
        border: `1px solid ${colors.line}`,
        background: colors.paper,
        color: colors.ink,
        fontWeight: 600,
        fontSize: 14,
        cursor: loading ? "wait" : "pointer",
        opacity: loading ? 0.7 : 1,
      }}
    >
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
        <path
          fill="#FFC107"
          d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"
        />
        <path
          fill="#FF3D00"
          d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.1 29.3 4 24 4 16.1 4 9.2 8.5 6.3 14.7z"
        />
        <path
          fill="#4CAF50"
          d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.3 26.7 36 24 36c-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.1 39.5 16 44 24 44z"
        />
        <path
          fill="#1976D2"
          d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.1-3.5 5.5-6.5 6.9l.1.1 6.2 5.2C36.9 41.1 44 36 44 24c0-1.2-.1-2.3-.4-3.5z"
        />
      </svg>
      {loading ? "Opening Google…" : label}
    </button>
  );
}

function AuthDivider() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        gap: 10,
        alignItems: "center",
        margin: "4px 0 2px",
      }}
    >
      <span style={{ height: 1, background: colors.lineSoft }} />
      <span style={{ color: colors.muted, fontSize: 12 }}>or</span>
      <span style={{ height: 1, background: colors.lineSoft }} />
    </div>
  );
}

export function LoginPage() {
  const { user, login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    navigate(user.onboarding_completed ? "/" : "/onboarding");
  }, [user, navigate]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async () => {
    setGoogleLoading(true);
    setError("");
    try {
      if (!isSupabaseConfigured()) {
        throw new Error("Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env");
      }
      await loginWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
      setGoogleLoading(false);
    }
  };

  return (
    <AuthForm
      title="Sign in"
      subtitle="A calm companion for your day"
      onSubmit={onSubmit}
      footer={
        <p style={{ color: colors.muted, marginBottom: 0 }}>
          New here? <Link to="/register">Create account</Link>
        </p>
      }
    >
      <GoogleButton onClick={() => void onGoogle()} loading={googleLoading} label="Continue with Google" />
      <AuthDivider />
      <Field label="Email" value={email} onChange={setEmail} type="email" />
      <Field label="Password" value={password} onChange={setPassword} type="password" />
      {error ? <p style={{ color: colors.danger, margin: 0 }}>{error}</p> : null}
      <Button type="submit" disabled={loading}>
        {loading ? "Signing in…" : "Sign in"}
      </Button>
    </AuthForm>
  );
}

export function RegisterPage() {
  const { user, register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    navigate(user.onboarding_completed ? "/" : "/onboarding");
  }, [user, navigate]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    if (!email.trim() || !email.includes("@")) {
      setError("Enter a valid email address.");
      setLoading(false);
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      setLoading(false);
      return;
    }
    try {
      await register(email, password, name.trim() || undefined);
      navigate("/onboarding");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Register failed");
    } finally {
      setLoading(false);
    }
  };

  const onGoogle = async () => {
    setGoogleLoading(true);
    setError("");
    try {
      if (!isSupabaseConfigured()) {
        throw new Error("Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env");
      }
      await loginWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-up failed");
      setGoogleLoading(false);
    }
  };

  return (
    <AuthForm
      title="Create account"
      subtitle="Let’s keep life gentle and clear"
      onSubmit={onSubmit}
      footer={
        <p style={{ color: colors.muted, marginBottom: 0 }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      }
    >
      <GoogleButton onClick={() => void onGoogle()} loading={googleLoading} label="Continue with Google" />
      <AuthDivider />
      <Field label="Name" value={name} onChange={setName} />
      <Field label="Email" value={email} onChange={setEmail} type="email" />
      <Field
        label="Password (min 8 characters)"
        value={password}
        onChange={setPassword}
        type="password"
      />
      {error ? <p style={{ color: colors.danger, margin: 0 }}>{error}</p> : null}
      <Button type="submit" disabled={loading}>
        {loading ? "Creating…" : "Create account"}
      </Button>
    </AuthForm>
  );
}
