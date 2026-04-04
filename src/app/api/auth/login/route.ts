import { NextRequest, NextResponse } from "next/server";
import { validatePassword, createSession, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  const valid = await validatePassword(password);
  if (!valid) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const token = await createSession();

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  return response;
}
