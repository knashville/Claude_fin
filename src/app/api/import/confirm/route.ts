import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseCSV, mapRowsToTransactions, ColumnMapping } from "@/lib/csv-parser";
import { categorizeTransaction } from "@/lib/categorizer";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File;
  const mappingStr = formData.get("mapping") as string;
  const accountId = formData.get("accountId") as string;

  if (!file || !mappingStr || !accountId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const mapping: ColumnMapping = JSON.parse(mappingStr);
  const text = await file.text();
  const { rows } = parseCSV(text);
  const transactions = mapRowsToTransactions(rows, mapping, accountId);

  // Check for existing hashes to skip duplicates
  const existingHashes = new Set(
    (
      await prisma.transaction.findMany({
        where: { dedupHash: { in: transactions.map((t) => t.dedupHash) } },
        select: { dedupHash: true },
      })
    ).map((t) => t.dedupHash)
  );

  const newTransactions = transactions.filter((t) => !existingHashes.has(t.dedupHash));

  // Create import batch
  const batch = await prisma.importBatch.create({
    data: {
      filename: file.name,
      accountId,
      rowCount: rows.length,
      importedCount: newTransactions.length,
      skippedCount: transactions.length - newTransactions.length,
    },
  });

  // Insert transactions with auto-categorization
  for (const txn of newTransactions) {
    const categoryId = await categorizeTransaction(txn.merchant, txn.rawMerchant);

    await prisma.transaction.create({
      data: {
        date: new Date(txn.date),
        amount: txn.amount,
        merchant: txn.merchant,
        rawMerchant: txn.rawMerchant,
        description: txn.description,
        accountId,
        importBatchId: batch.id,
        dedupHash: txn.dedupHash,
        categoryId,
      },
    });
  }

  return NextResponse.json({
    batchId: batch.id,
    imported: newTransactions.length,
    skipped: transactions.length - newTransactions.length,
    total: rows.length,
  });
}
