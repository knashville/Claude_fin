import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const updated = await prisma.account.update({
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
  // Check for transactions
  const count = await prisma.transaction.count({ where: { accountId: id } });
  if (count > 0) {
    return NextResponse.json(
      { error: `Cannot delete account with ${count} transactions. Delete transactions first.` },
      { status: 400 }
    );
  }
  await prisma.importBatch.deleteMany({ where: { accountId: id } });
  await prisma.account.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
