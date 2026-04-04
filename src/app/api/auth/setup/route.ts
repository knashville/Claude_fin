import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isPasswordSet, createSession, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  // Only allow setup if no password exists yet
  const hasPassword = await isPasswordSet();
  if (hasPassword) {
    return NextResponse.json({ error: "Password already set" }, { status: 400 });
  }

  const { password } = await req.json();
  if (!password || password.length < 4) {
    return NextResponse.json({ error: "Password must be at least 4 characters" }, { status: 400 });
  }

  const hash = await bcrypt.hash(password, 10);
  await prisma.settings.upsert({
    where: { key: "password_hash" },
    update: { value: hash },
    create: { key: "password_hash", value: hash },
  });

  // Auto-login after setup
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
