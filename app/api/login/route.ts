// POST /api/login: checks the passphrase and, if it matches, sets the login cookie.

import { NextResponse } from "next/server";
import { SESSION_COOKIE, sessionToken } from "@/lib/auth";

export async function POST(request: Request) {
  const { password } = (await request.json()) as { password?: string };
  if (!process.env.APP_PASSWORD || password !== process.env.APP_PASSWORD) {
    return NextResponse.json({ error: "That passphrase doesn't match." }, { status: 401 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, await sessionToken(), {
    httpOnly: true, // page scripts can't read it
    secure: process.env.NODE_ENV === "production", // only sent over HTTPS once deployed
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 90, // stay logged in for 90 days
  });
  return response;
}
