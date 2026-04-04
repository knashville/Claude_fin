import { cookies } from "next/headers";
import { createHash, randomBytes } from "crypto";
import { prisma } from "./db";
import bcrypt from "bcryptjs";

const SESSION_COOKIE = "clearbooks_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const hashedToken = hashToken(token);

  await prisma.settings.upsert({
    where: { key: "session_token" },
    update: { value: hashedToken },
    create: { key: "session_token", value: hashedToken },
  });

  return token;
}

export async function validateSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return false;

  const hashedToken = hashToken(token);
  const stored = await prisma.settings.findUnique({
    where: { key: "session_token" },
  });

  return stored?.value === hashedToken;
}

export async function validatePassword(password: string): Promise<boolean> {
  const stored = await prisma.settings.findUnique({
    where: { key: "password_hash" },
  });
  if (!stored) return false;
  return bcrypt.compare(password, stored.value);
}

export async function isPasswordSet(): Promise<boolean> {
  const stored = await prisma.settings.findUnique({
    where: { key: "password_hash" },
  });
  return !!stored;
}

export { SESSION_COOKIE, SESSION_MAX_AGE };
