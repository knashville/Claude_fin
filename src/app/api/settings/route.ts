import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function GET() {
  const settings = await prisma.settings.findMany();
  const map: Record<string, string> = {};
  for (const s of settings) {
    if (s.key !== "password_hash") {
      map[s.key] = s.value;
    }
  }
  // Check if password is set
  const hasPassword = settings.some((s) => s.key === "password_hash");
  map["has_password"] = String(hasPassword);
  return NextResponse.json(map);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.action === "set_password") {
    const hash = await bcrypt.hash(body.password, 10);
    await prisma.settings.upsert({
      where: { key: "password_hash" },
      update: { value: hash },
      create: { key: "password_hash", value: hash },
    });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "update_setting") {
    await prisma.settings.upsert({
      where: { key: body.key },
      update: { value: body.value },
      create: { key: body.key, value: body.value },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
