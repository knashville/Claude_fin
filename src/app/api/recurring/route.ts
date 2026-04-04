import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { detectRecurringPatterns } from "@/lib/recurring";

export async function GET() {
  const patterns = await prisma.recurringPattern.findMany({
    where: { isDismissed: false },
    orderBy: [{ isConfirmed: "desc" }, { confidence: "desc" }],
  });
  return NextResponse.json(patterns);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.action === "detect") {
    const count = await detectRecurringPatterns();
    return NextResponse.json({ detected: count });
  }

  if (body.action === "confirm" && body.id) {
    await prisma.recurringPattern.update({
      where: { id: body.id },
      data: { isConfirmed: true },
    });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "dismiss" && body.id) {
    await prisma.recurringPattern.update({
      where: { id: body.id },
      data: { isDismissed: true },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
