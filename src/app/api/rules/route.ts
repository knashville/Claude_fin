import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { recategorizeAll } from "@/lib/categorizer";

export async function GET() {
  const rules = await prisma.categorizationRule.findMany({
    include: { category: true },
    orderBy: { priority: "desc" },
  });
  return NextResponse.json(rules);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.action === "rerun") {
    const updated = await recategorizeAll();
    return NextResponse.json({ updated });
  }

  const rule = await prisma.categorizationRule.create({
    data: {
      pattern: body.pattern,
      field: body.field ?? "merchant",
      matchType: body.matchType ?? "contains",
      categoryId: body.categoryId,
      priority: body.priority ?? 0,
    },
    include: { category: true },
  });
  return NextResponse.json(rule);
}
