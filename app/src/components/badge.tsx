type Tone = "gray" | "green" | "amber" | "red" | "blue";

// Serene Network chips: pill-shaped, low-opacity category fill (DESIGN §Components).
const tones: Record<Tone, string> = {
  gray: "bg-surface-container text-on-surface-variant",
  green: "bg-primary-fixed text-on-primary-fixed",
  amber: "bg-warning-container text-on-warning-container",
  red: "bg-error-container text-on-error-container",
  blue: "bg-secondary-container text-on-secondary-container",
};

export function Badge({ tone = "gray", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}
