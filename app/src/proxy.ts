import { NextResponse, type NextRequest } from "next/server";

// Optimistic, cookie-only auth redirects (ADR 0003). No DB access here — the authoritative
// check is the Data Access Layer (requireUser) on each protected render/action.
const PUBLIC_ROUTES = new Set(["/login"]);
const SESSION_COOKIE = "fixer_session";

export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_ROUTES.has(pathname);
  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);

  if (!hasSession && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }
  if (hasSession && isPublic) {
    return NextResponse.redirect(new URL("/workspace", req.nextUrl));
  }
  return NextResponse.next();
}

export const config = {
  // Run on everything except API routes, Next internals, and static assets.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|ico)$).*)"],
};
