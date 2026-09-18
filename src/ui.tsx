import { CSSProperties, FormEvent, ReactNode } from "react";

import { colors, fonts, radii } from "./theme";

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
    <div className={className} style={{ ...styles.card, ...style }}>
      {children}
    </div>
  );
}

export function Companion({ size = 48 }: { size?: number }) {
  const eye = Math.max(5, Math.round(size * 0.12));
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        background: `linear-gradient(145deg, ${colors.apricotSoft}, ${colors.mossSoft})`,
        border: `1.5px solid ${colors.line}`,
        boxShadow: `inset 0 -6px 14px rgba(31,26,22,0.06)`,
        display: "grid",
        placeItems: "center",
      }}
      aria-hidden
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: size * 0.04 }}>
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
      ? colors.apricot
      : variant === "moss"
        ? colors.moss
        : variant === "danger"
          ? colors.blush
          : "transparent";
  const color = variant === "moss" ? colors.paper : colors.ink;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="soft-btn"
      style={{
        ...styles.button,
        background,
        color,
        border: variant === "ghost" ? `1px solid ${colors.line}` : "none",
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {children}
    </button>
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
      <div style={styles.authWrap} className="fade-up">
        <Companion size={72} />
        <h1 style={styles.brand}>LifeOS</h1>
        <p style={styles.lede}>{subtitle}</p>
        <div style={styles.authPanel}>
          <h2 style={styles.authTitle}>{title}</h2>
          <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {children}
          </form>
          <div style={{ marginTop: 16 }}>{footer}</div>
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
  return <p style={{ color: colors.muted, margin: 0, lineHeight: 1.5 }}>{children}</p>;
}

const styles: Record<string, CSSProperties> = {
  card: {
    background: colors.paper,
    border: `1px solid ${colors.lineSoft}`,
    borderRadius: radii.lg,
    padding: 16,
    boxShadow: "0 10px 30px rgba(31,26,22,0.04)",
  },
  eye: {
    borderRadius: 999,
    background: colors.ink,
    display: "inline-block",
    transformOrigin: "center",
  },
  button: {
    borderRadius: radii.pill,
    padding: "8px 14px",
    fontWeight: 650,
    cursor: "pointer",
    letterSpacing: 0.01,
    fontSize: 13,
  },
  field: { display: "flex", flexDirection: "column", gap: 5 },
  label: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: 650,
    letterSpacing: 0.04,
    textTransform: "uppercase",
  },
  input: {
    borderRadius: 12,
    border: `1px solid ${colors.line}`,
    padding: "10px 12px",
    fontSize: 14,
    background: colors.bgSoft,
    color: colors.ink,
    outline: "none",
  },
  authWrap: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 24,
  },
  brand: {
    margin: "4px 0 0",
    fontFamily: fonts.display,
    fontSize: 42,
    fontWeight: 700,
    letterSpacing: -1,
    color: colors.ink,
  },
  lede: {
    color: colors.muted,
    margin: "0 0 14px",
    fontSize: 15,
    maxWidth: 320,
    textAlign: "center",
    lineHeight: 1.45,
  },
  authPanel: {
    width: "min(380px, 100%)",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  authTitle: {
    margin: "0 0 10px",
    fontFamily: fonts.display,
    fontSize: 24,
    fontWeight: 600,
    color: colors.ink,
  },
  pageTitle: {
    margin: 0,
    fontFamily: fonts.display,
    fontSize: 26,
    fontWeight: 650,
    letterSpacing: -0.4,
    color: colors.ink,
  },
  pageSub: {
    margin: "4px 0 0",
    color: colors.muted,
    fontSize: 13,
  },
};
