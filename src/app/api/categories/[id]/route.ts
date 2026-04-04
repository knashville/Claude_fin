import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const updated = await prisma.category.update({
    where: { id },
    data: body,
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // Unset category from transactions first
  await prisma.transaction.updateMany({
    where: { categoryId: id },
    data: { categoryId: null },
  });
  await prisma.categorizationRule.deleteMany({ where: { categoryId: id } });
  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
