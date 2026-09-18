import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../auth";
import { AuthForm, Button, Field } from "../ui";
import { colors } from "../theme";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
