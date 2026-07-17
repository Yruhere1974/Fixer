// Shared shape for server-action form results wired to useActionState.
export interface FormState {
  ok: boolean;
  error?: string;
}

export const okState: FormState = { ok: true };
export function errState(error: string): FormState {
  return { ok: false, error };
}

/** Trim a FormData string field; returns "" when absent. */
export function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/** Read a set of checkbox/multi-select values as an array of strings. */
export function strList(formData: FormData, key: string): string[] {
  return formData.getAll(key).map((v) => String(v)).filter(Boolean);
}

/** Parse an optional decimal; returns null when blank/invalid. */
export function decimal(formData: FormData, key: string): number | null {
  const raw = str(formData, key);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** Parse an optional date (yyyy-mm-dd); returns null when blank/invalid. */
export function date(formData: FormData, key: string): Date | null {
  const raw = str(formData, key);
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}
