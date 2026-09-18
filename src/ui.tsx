import { CSSProperties, FormEvent, ReactNode, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { clayShadow, colors, fonts, radii } from "./theme";
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
    <div className={`panel ${className || ""}`} style={{ padding: 18, ...style }}>
      {children}
    </div>
  );
}

export function Companion({ size = 48 }: { size?: number }) {
  const eye = Math.max(5, Math.round(size * 0.12));
  return (
    <div
      className="companion-float"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        background: `linear-gradient(145deg, ${colors.apricotSoft}, ${colors.mossSoft})`,
        boxShadow: clayShadow({ lift: 8 }),
        display: "grid",
        placeItems: "center",
      }}
      aria-hidden
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: size * 0.04,
        }}
      >
        <div style={{ display: "flex", gap: size * 0.16 }}>
          <span className="companion-eye" style={{ ...styles.eye, width: eye, height: eye }} />
          <span className="companion-eye" style={{ ...styles.eye, width: eye, height: eye }} />
        </div>
        <span
          style={{
            width: size * 0.28,
            height: size * 0.14,
            border: `2px solid ${colors.ink}`,
            borderTop: "none",
            borderRadius: "0 0 12px 12px",
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
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger" | "moss";
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const background =
    variant === "primary"
      ? `linear-gradient(160deg, color-mix(in srgb, ${colors.apricot} 75%, white), ${colors.apricot})`
      : variant === "moss"
        ? `linear-gradient(160deg, color-mix(in srgb, ${colors.moss} 80%, white), ${colors.moss})`
        : variant === "danger"
          ? colors.blush
          : "var(--panel)";
  const color = variant === "moss" || variant === "primary" ? "#fff" : colors.ink;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="clay-btn soft-btn"
      style={{
        ...styles.button,
        background,
        color,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {children}
    </button>
  );
}

export function ThemeToggle() {
  const { style, scheme, setStyle, setScheme } = useThemeMode();
  return (
    <div className="theme-controls">
      <div className="theme-toggle" role="group" aria-label="Surface style">
        <button
          type="button"
          className={style === "clay" ? "is-active" : undefined}
          onClick={() => setStyle("clay")}
        >
          Clay
        </button>
        <button
          type="button"
          className={style === "glass" ? "is-active" : undefined}
          onClick={() => setStyle("glass")}
        >
          Glass
        </button>
      </div>
      <div className="theme-toggle" role="group" aria-label="Color scheme">
        <button
          type="button"
          className={scheme === "light" ? "is-active" : undefined}
          onClick={() => setScheme("light")}
        >
          Light
        </button>
        <button
          type="button"
          className={scheme === "dark" ? "is-active" : undefined}
          onClick={() => setScheme("dark")}
        >
          Dark
        </button>
      </div>
    </div>
  );
}

export function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button type="button" className="icon-btn" aria-label={label} title={label} onClick={onClick}>
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
    <div className="account-menu" ref={ref}>
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
        <div className="account-dropdown panel" role="menu">
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
            <div className="account-theme-label">Appearance</div>
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

function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
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
      <path
        d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
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
    <label style={styles.field}>
      <span style={styles.label}>{label}</span>
      <input
        className="clay-input"
        style={styles.input}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        placeholder={placeholder}
      />
    </label>
  );
}

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
      <div className="auth-screen fade-up">
        <div className="auth-card panel panel-warm">
          <div className="auth-brand">
            <Companion size={56} />
            <h1 className="auth-brand-name">LifeOS</h1>
            <p className="auth-lede">{subtitle}</p>
          </div>

          <h2 className="auth-title">{title}</h2>
          <form onSubmit={onSubmit} className="auth-form">
            {children}
          </form>
          <div className="auth-footer">{footer}</div>
        </div>

        <div className="auth-theme">
          <ThemeToggle />
        </div>
      </div>
    </Shell>
  );
}

export function PageTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <header style={{ marginBottom: 20 }}>
      <h1 style={styles.pageTitle}>{title}</h1>
      {subtitle ? <p style={styles.pageSub}>{subtitle}</p> : null}
    </header>
  );
}

export function EmptyHint({ children }: { children: ReactNode }) {
  return (
    <p style={{ color: colors.muted, margin: 0, lineHeight: 1.55, fontSize: 14 }}>
      {children}
    </p>
  );
}

const styles: Record<string, CSSProperties> = {
  eye: {
    borderRadius: 999,
    background: colors.ink,
    display: "inline-block",
    transformOrigin: "center",
  },
  button: {
    borderRadius: radii.pill,
    padding: "9px 16px",
    fontWeight: 650,
    cursor: "pointer",
    letterSpacing: 0.01,
    fontSize: 13,
    border: "none",
  },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: 650,
    letterSpacing: 0.05,
    textTransform: "uppercase",
  },
  input: {
    padding: "11px 13px",
    fontSize: 14,
  },
  pageTitle: {
    margin: 0,
    fontFamily: fonts.display,
    fontSize: 28,
    fontWeight: 650,
    letterSpacing: -0.4,
    color: colors.ink,
  },
  pageSub: {
    margin: "6px 0 0",
    color: colors.muted,
    fontSize: 14,
  },
};
