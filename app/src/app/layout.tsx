import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { currentUser } from "@/lib/session";
import { canHandleIncidents, canHandlePrivacy, canReportIncident } from "@/lib/access";
import { logout } from "@/app/login/actions";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });

export const metadata: Metadata = {
  title: "MedFixer Operations",
  description: "Controlled client-information workspace for the Kelowna Health & Wellness Navigator.",
};

const roleLabel: Record<string, string> = {
  FOUNDER: "Founder",
  LEAD_NAVIGATOR: "Lead Navigator",
  NAVIGATOR: "Navigator",
  ASSISTANT: "Assistant",
  PRIVACY_LEAD: "Privacy Lead",
  REVIEWER: "Reviewer",
  BOOKKEEPER: "Bookkeeper",
  EXTERNAL_ADVISOR: "External Advisor",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await currentUser();

  return (
    <html lang="en" className={`${manrope.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        {user && (
          <header className="border-b border-outline-variant/60 bg-surface-lowest">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
              <Link href="/" className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-on-primary">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 21s-7-4.35-7-10a7 7 0 0 1 14 0c0 5.65-7 10-7 10Z" />
                    <path d="M12 8v6M9 11h6" />
                  </svg>
                </span>
                <span className="text-lg font-semibold tracking-tight text-primary">
                  Med<span className="text-on-surface">Fixer</span>
                </span>
              </Link>
              <nav className="hidden gap-6 text-sm text-on-surface-variant sm:flex">
                <Link href="/" className="hover:text-primary">Workspace</Link>
                <Link href="/providers" className="hover:text-primary">Providers</Link>
                {canHandleIncidents(user.role) ? (
                  <Link href="/incidents" className="hover:text-primary">Incidents</Link>
                ) : canReportIncident(user.role) ? (
                  <Link href="/incidents/new" className="hover:text-primary">Report incident</Link>
                ) : null}
                {canHandlePrivacy(user.role) && (
                  <Link href="/privacy" className="hover:text-primary">Privacy</Link>
                )}
              </nav>
              <div className="flex items-center gap-4">
                <span className="rounded-full bg-warning-container px-3 py-1 text-xs font-medium text-on-warning-container">
                  Fictional data
                </span>
                <div className="text-right text-sm leading-tight">
                  <div className="font-medium text-on-surface">{user.name}</div>
                  <div className="text-xs text-on-surface-variant">{roleLabel[user.role]}</div>
                </div>
                <form action={logout}>
                  <button className="rounded-full border border-outline-variant px-3 py-1.5 text-xs font-semibold text-on-surface-variant hover:bg-surface-low">
                    Sign out
                  </button>
                </form>
              </div>
            </div>
          </header>
        )}
        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">{children}</main>
        <footer className="border-t border-outline-variant/50 bg-surface-lowest">
          <div className="mx-auto max-w-6xl px-6 py-6 text-xs text-on-surface-variant">
            MedFixer Operations · Care-First coordination · Non-clinical
          </div>
        </footer>
      </body>
    </html>
  );
}
