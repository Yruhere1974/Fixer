"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState | null, FormData>(login, null);

  return (
    <form action={formAction} className="space-y-4">
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-on-surface-variant">Email</span>
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          className="field w-full px-3 py-2"
          placeholder="you@fixer.local"
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-on-surface-variant">Password</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="field w-full px-3 py-2"
        />
      </label>

      {state?.error && (
        <p className="rounded-lg border border-error/30 bg-error-container px-3 py-2 text-sm text-on-error-container">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary shadow-[0_4px_12px_rgba(90,86,137,0.3)] hover:bg-primary-container disabled:opacity-50"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
