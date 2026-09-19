import { CSSProperties, FormEvent, ReactNode, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { THEMES, colors } from "./theme";
import { useThemeMode } from "./themeMode";

export function Shell({ children }: { children: ReactNode }) {
  return <div className="lifeos-shell">{children}</div>;
}

export function Card({
  children,
  style,
  className,
}: {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <div className={`surface ${className || ""}`} style={{ padding: 16, ...style }}>
      {children}
    </div>
  );
}

/** The LifeOS mark — a rounded square that carries the active accent. */
export function Companion({ size = 32 }: { size?: number }) {
  const dot = Math.max(3, Math.round(size * 0.1));
  return (
    <div
      className="companion-float"
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.32),
        background: colors.accent,
        color: colors.accentInk,
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
        boxShadow: [
          `inset 0 ${Math.round(size * 0.07)}px ${Math.round(size * 0.14)}px var(--on-accent-hi)`,
          `inset 0 -${Math.round(size * 0.1)}px ${Math.round(size * 0.18)}px var(--on-accent-lo)`,
          `0 ${Math.round(size * 0.18)}px ${Math.round(size * 0.34)}px var(--clay-drop)`,
        ].join(", "),
      }}
      aria-hidden
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: size * 0.1 }}>
        <div style={{ display: "flex", gap: size * 0.14 }}>
          <span style={{ width: dot, height: dot, borderRadius: 999, background: "currentColor" }} />
          <span style={{ width: dot, height: dot, borderRadius: 999, background: "currentColor" }} />
        </div>
        <span
          style={{
            width: size * 0.34,
            height: size * 0.14,
            border: `${Math.max(1.5, size * 0.055)}px solid currentColor`,
            borderTop: "none",
            borderRadius: `0 0 ${size}px ${size}px`,
          }}
        />
      </div>
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = "primary",
  type = "button",
  disabled,
  full,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger";
  type?: "button" | "submit";
  disabled?: boolean;
  full?: boolean;
}) {
  const palette: Record<string, CSSProperties> = {
    primary: { background: colors.accent, color: colors.accentInk },
    ghost: { color: colors.ink },
    danger: { background: colors.dangerSoft, color: colors.danger },
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`ui-btn${variant === "ghost" ? " is-ghost" : ""}`}
      style={{
        padding: "10px 16px",
        fontSize: 13,
        width: full ? "100%" : undefined,
        opacity: disabled ? 0.5 : 1,
        ...palette[variant],
      }}
    >
      {children}
    </button>
  );
}

export function ThemeToggle() {
  const { theme, setTheme } = useThemeMode();
  return (
    <div className="theme-picker" role="group" aria-label="Theme">
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`theme-option${theme === t.id ? " is-active" : ""}`}
          aria-pressed={theme === t.id}
          onClick={() => setTheme(t.id)}
        >
          <span className="theme-swatch">
            {t.id === "playful" ? (
              <>
                <i style={{ background: "#f4846f" }} />
                <i style={{ background: "#5ec7ad" }} />
                <i style={{ background: "#f3c667" }} />
                <i style={{ background: "#a894ec" }} />
              </>
            ) : (
              <>
                <i style={{ background: "#0c0e0d" }} />
                <i style={{ background: "#3a403d" }} />
                <i style={{ background: "#8b948f" }} />
                <i style={{ background: "#eef1ef" }} />
              </>
            )}
          </span>
          <span className="theme-option-text">
            <strong>{t.label}</strong>
            <small>{t.hint}</small>
          </span>
        </button>
      ))}
    </div>
  );
}

export function IconButton({
  label,
  onClick,
  children,
  active,
}: {
  label: string;
  onClick?: () => void;
  children: ReactNode;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      className="icon-btn"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={onClick}
      style={
        active
          ? { background: colors.accent, color: colors.accentInk, borderColor: colors.accent }
          : undefined
      }
    >
      {children}
    </button>
  );
}

export function AccountMenu({
  name,
  email,
  onLogout,
}: {
  name?: string | null;
  email?: string | null;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const initial = (name || email || "U").trim().charAt(0).toUpperCase();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="account-menu" ref={ref} data-tour="account">
      <button
        type="button"
        className="account-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="account-avatar">{initial}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
          <path
            d="M3 4.5 L6 7.5 L9 4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open ? (
        <div className="account-dropdown" role="menu">
          <div className="account-meta">
            <div className="account-meta-name">{name || "Account"}</div>
            {email ? <div className="account-meta-email">{email}</div> : null}
          </div>
          <button
            type="button"
            className="account-item"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              navigate("/settings");
            }}
          >
            <SettingsIcon />
            Settings
          </button>
          <div className="account-theme">
            <div className="account-theme-label">Theme</div>
            <ThemeToggle />
          </div>
          <button
            type="button"
            className="account-item account-item-danger"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            <LogoutIcon />
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M19.4 15a1.7 1.7 0 0 0 .34 1.86l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.86-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.86.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.86 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.86l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.86.34H9a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.86-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.86V9c0 .69.4 1.3 1 1.55H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1.45Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M16 17l5-5-5-5M21 12H9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 12.5, color: colors.muted, fontWeight: 600 }}>{label}</span>
      <input
        className="field-input"
        style={{ padding: "11px 13px", fontSize: 14 }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        placeholder={placeholder}
      />
    </label>
  );
}

const AUTH_HIGHLIGHTS = [
  { tone: colors.mint, text: "Say it in plain words — LifeOS books it" },
  { tone: colors.peach, text: "One view for tasks, events and your day" },
  { tone: colors.sky, text: "Quiet nudges before anything is due" },
];

export function AuthForm({
  title,
  subtitle,
  onSubmit,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  onSubmit: (e: FormEvent) => void;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <Shell>
      <div className="auth-screen">
        <aside className="auth-aside">
          <div className="auth-aside-brand">
            <Companion size={30} />
            LifeOS
          </div>
          <div className="auth-aside-copy fade-up">
            <h2>Your day, sorted by conversation</h2>
            <p>
              Tell LifeOS what is on your mind. It turns the mess into tasks, events and reminders
              you can actually keep.
            </p>
          </div>
          <div className="auth-aside-list">
            {AUTH_HIGHLIGHTS.map((h) => (
              <div key={h.text} className="auth-aside-item">
                <i style={{ background: h.tone }} />
                {h.text}
              </div>
            ))}
          </div>
        </aside>

        <div className="auth-panel">
          <div className="auth-card fade-up">
            <h1 className="auth-title">{title}</h1>
            <p className="auth-lede">{subtitle}</p>
            <form onSubmit={onSubmit} className="auth-form">
              {children}
            </form>
            <div className="auth-footer">{footer}</div>
            <div className="auth-theme">
              <div className="account-theme-label">Theme</div>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

export function EmptyHint({ children }: { children: ReactNode }) {
  return <p className="empty-hint">{children}</p>;
}
