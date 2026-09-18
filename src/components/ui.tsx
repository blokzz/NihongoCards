import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

type Variant = "accent" | "surface" | "ghost" | "danger";

const variants: Record<Variant, string> = {
  accent: "text-[var(--on-accent)] bg-[var(--accent)] hover:bg-[var(--accent-hover)]",
  surface:
    "text-[var(--text)] bg-[var(--surface-2)] hover:brightness-125 border border-[var(--border)]",
  ghost: "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]",
  danger: "text-white bg-red-600/90 hover:bg-red-600",
};

export function Button({
  variant = "surface",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return (
    <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
      {children}
    </span>
  );
}

const fieldBase =
  "w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)]";

export function TextField(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${fieldBase} ${props.className ?? ""}`} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${fieldBase} resize-y ${props.className ?? ""}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${fieldBase} ${props.className ?? ""}`} />;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 ${className}`}
    >
      {children}
    </div>
  );
}
