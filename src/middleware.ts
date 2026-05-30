import { NextRequest, NextResponse } from "next/server";

/**
 * CSRF / drive-by guard for a loopback-only app.
 * State-changing requests (POST/PUT/DELETE/PATCH) must originate same-origin.
 * A cross-site page can send a CORS-"simple" request (text/plain body) without a
 * preflight; this blocks those by checking Origin + Sec-Fetch-Site. GET is allowed
 * so the app shell and exports load normally.
 */
export function middleware(req: NextRequest) {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return NextResponse.next();
  }
  if (!req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const site = req.headers.get("sec-fetch-site");
  // Modern browsers send Sec-Fetch-Site. same-origin / none (address bar, app) are OK.
  if (site && site !== "same-origin" && site !== "none") {
    return new NextResponse(JSON.stringify({ error: "cross-site request blocked" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Fallback for clients that send Origin but not Sec-Fetch-Site.
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      const o = new URL(origin);
      const host = req.headers.get("host") || req.nextUrl.host;
      if (o.host !== host) {
        return new NextResponse(JSON.stringify({ error: "cross-origin request blocked" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }
    } catch {
      return new NextResponse(JSON.stringify({ error: "bad origin" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
