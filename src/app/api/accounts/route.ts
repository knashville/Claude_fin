import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const accounts = await prisma.account.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json(accounts);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const account = await prisma.account.create({
    data: {
      name: body.name,
      type: body.type ?? "checking",
      currentBalance: body.currentBalance ?? 0,
    },
  });
  return NextResponse.json(account);
}
