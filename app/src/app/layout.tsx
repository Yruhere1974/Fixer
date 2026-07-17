import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });

export const metadata: Metadata = {
  title: "MedFixer Operations",
  description: "Controlled client-information workspace for the Kelowna Health & Wellness Navigator.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${manrope.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
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
            <div className="flex items-center gap-4">
              <nav className="hidden gap-6 text-sm text-on-surface-variant sm:flex">
                <Link href="/" className="hover:text-primary">Workspace</Link>
              </nav>
              <span className="rounded-full bg-warning-container px-3 py-1 text-xs font-medium text-on-warning-container">
                Fictional data
              </span>
            </div>
          </div>
        </header>
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
