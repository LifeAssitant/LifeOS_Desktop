import { CSSProperties, FormEvent, ReactNode } from "react";

import { colors } from "./theme";

export function Shell({ children }: { children: ReactNode }) {
  return <div style={styles.shell}>{children}</div>;
}

export function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ ...styles.card, ...style }}>{children}</div>;
}

export function Companion({ size = 48 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        background: colors.peachSoft,
        border: `2px solid ${colors.peach}`,
        display: "grid",
        placeItems: "center",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <span style={styles.eye} />
          <span style={styles.eye} />
        </div>
        <span
          style={{
            width: 14,
            height: 7,
            border: `2px solid ${colors.ink}`,
            borderTop: "none",
            borderRadius: "0 0 10px 10px",
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
  variant?: "primary" | "ghost" | "danger";
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const background =
    variant === "primary" ? colors.peach : variant === "danger" ? colors.blush : "transparent";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...styles.button,
        background,
        border: variant === "ghost" ? `1px solid ${colors.line}` : "none",
        opacity: disabled ? 0.6 : 1,
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
      <div style={styles.authWrap}>
        <Companion size={64} />
        <h1 style={styles.brand}>LifeOS</h1>
        <p style={styles.muted}>{subtitle}</p>
        <Card style={{ width: 360, display: "flex", flexDirection: "column", gap: 12 }}>
          <h2 style={{ margin: 0, color: colors.ink }}>{title}</h2>
          <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {children}
          </form>
          {footer}
        </Card>
      </div>
    </Shell>
  );
}

const styles: Record<string, CSSProperties> = {
  shell: {
    minHeight: "100vh",
    background: `radial-gradient(circle at top left, ${colors.peachSoft}, transparent 40%), radial-gradient(circle at bottom right, ${colors.mintSoft}, transparent 35%), ${colors.bg}`,
    color: colors.ink,
    fontFamily: '"Segoe UI", "Nunito", system-ui, sans-serif',
  },
  card: {
    background: colors.card,
    border: `1px solid ${colors.line}`,
    borderRadius: 18,
    padding: 16,
  },
  eye: {
    width: 6,
    height: 6,
    borderRadius: 3,
    background: colors.ink,
    display: "inline-block",
  },
  button: {
    borderRadius: 999,
    padding: "10px 16px",
    fontWeight: 700,
    cursor: "pointer",
    color: colors.ink,
  },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 13, color: colors.muted, fontWeight: 600 },
  input: {
    borderRadius: 14,
    border: `1px solid ${colors.line}`,
    padding: "10px 12px",
    fontSize: 15,
    background: colors.bgSoft,
    color: colors.ink,
  },
  authWrap: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  brand: { margin: 0, fontSize: 34, letterSpacing: -0.5 },
  muted: { color: colors.muted, marginTop: 0 },
};
