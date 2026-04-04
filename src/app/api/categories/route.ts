import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { transactions: true } } },
  });
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const category = await prisma.category.create({
    data: {
      name: body.name,
      color: body.color ?? "#6B7280",
      icon: body.icon ?? "tag",
      isIncome: body.isIncome ?? false,
    },
  });
  return NextResponse.json(category);
}
