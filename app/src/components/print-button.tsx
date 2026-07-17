"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-on-primary shadow-[0_4px_12px_rgba(90,86,137,0.3)] hover:bg-primary-container"
    >
      Print / Save as PDF
    </button>
  );
}
