import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const data: Record<string, unknown> = {};
  if (body.categoryId !== undefined) {
    data.categoryId = body.categoryId;
    data.isManualCategory = true;
  }
  if (body.merchant !== undefined) data.merchant = body.merchant;

  const updated = await prisma.transaction.update({
    where: { id },
    data,
    include: { category: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.transaction.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
