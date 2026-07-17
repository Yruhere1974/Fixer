"use client";

import { useFormStatus } from "react-dom";

/** Submit button that disables and shows a pending label while its form is submitting. */
export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  className = "",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "outline" | "danger";
  className?: string;
}) {
  const { pending } = useFormStatus();

  const base = "rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-50";
  const variants = {
    primary: "bg-primary text-on-primary shadow-[0_4px_12px_rgba(90,86,137,0.3)] hover:bg-primary-container",
    outline: "border border-outline-variant text-on-surface-variant hover:bg-surface-low",
    danger: "border-2 border-error text-error hover:bg-error-container/40",
  };

  return (
    <button type="submit" disabled={pending} className={`${base} ${variants[variant]} ${className}`}>
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
