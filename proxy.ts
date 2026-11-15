// Next.js runs this before every page and API request.
// It sends anyone without the login cookie to the /login page.

import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, sessionToken } from "./lib/auth";

export async function proxy(request: NextRequest) {
  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  if (cookie && cookie === (await sessionToken())) {
    return NextResponse.next();
  }
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  // Run on everything except the login page itself and Next.js's own files.
  matcher: ["/((?!login|api/login|_next/static|_next/image|favicon.ico).*)"],
};
