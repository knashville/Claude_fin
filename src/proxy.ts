import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "clearbooks_session";

// Routes that don't require auth
const PUBLIC_PATHS = ["/login", "/api/auth/"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow static assets and service worker
  if (pathname.startsWith("/_next/") || pathname === "/favicon.ico" || pathname === "/sw.js" || pathname === "/manifest.json" || pathname.startsWith("/icon-")) {
    return NextResponse.next();
  }

  // Check session cookie
  const token = req.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    // Redirect to login for page requests, 401 for API requests
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Validate token against stored hash
  // Note: We can't use Prisma in middleware (edge runtime), so we use a
  // lightweight check. The full validation happens in API routes.
  // For middleware, we just check that a token cookie exists.
  // The real validation is done server-side when data is accessed.

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all routes except static files
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
