import { NextResponse } from "next/server";
import { validateSession, isPasswordSet } from "@/lib/auth";

export async function GET() {
  const hasPassword = await isPasswordSet();

  if (!hasPassword) {
    return NextResponse.json({ status: "setup_required" });
  }

  const valid = await validateSession();
  if (!valid) {
    return NextResponse.json({ status: "login_required" });
  }

  return NextResponse.json({ status: "authenticated" });
}
