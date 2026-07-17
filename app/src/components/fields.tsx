// Presentational form fields (Serene Lavender). Plain server-safe components.
import type { ReactNode } from "react";

export function Labeled({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-on-surface-variant">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-on-surface-variant/70">{hint}</span>}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`field w-full px-3 py-2 ${props.className ?? ""}`} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`field w-full px-3 py-2 ${props.className ?? ""}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`field w-full px-3 py-2 ${props.className ?? ""}`} />;
}

export function Checkbox({
  name,
  label,
  value,
  defaultChecked,
}: {
  name: string;
  label: string;
  /** Submitted value when checked. Omit for a boolean "on" checkbox. */
  value?: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-on-surface">
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="h-4 w-4 rounded border-outline-variant"
      />
      {label}
    </label>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="rounded-lg border border-error/30 bg-error-container px-3 py-2 text-sm text-on-error-container">
      {message}
    </p>
  );
}
