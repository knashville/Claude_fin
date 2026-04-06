import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTransactions, getAccountBalances } from "@/lib/teller";
import { createHash } from "crypto";
import { normalizeMerchant } from "@/lib/utils";
import { categorizeTransaction } from "@/lib/categorizer";

export async function POST() {
  try {
    // Get all Teller-linked accounts
    const accounts = await prisma.account.findMany({
      where: { plaidAccessToken: { not: null } },
    });

    if (accounts.length === 0) {
      return NextResponse.json({ error: "No linked accounts" }, { status: 400 });
    }

    let totalImported = 0;
    let totalSkipped = 0;

    for (const account of accounts) {
      const accessToken = account.plaidAccessToken!;
      const tellerAccountId = account.plaidAccountId!;

      // Update balance
      try {
        const balance = await getAccountBalances(accessToken, tellerAccountId);
        const balanceCents = Math.round(parseFloat(balance.ledger) * 100);
        await prisma.account.update({
          where: { id: account.id },
          data: { currentBalance: balanceCents, lastSynced: new Date() },
        });
      } catch {
        // Balance fetch might fail, continue with transactions
      }

      // Fetch transactions
      let tellerTransactions;
      try {
        tellerTransactions = await getTransactions(accessToken, tellerAccountId);
      } catch (error) {
        console.error(`Failed to fetch transactions for ${account.name}:`, error);
        continue;
      }

      for (const txn of tellerTransactions) {
        const rawMerchant = txn.merchant_name || txn.description || "Unknown";
        const merchant = normalizeMerchant(rawMerchant);
        // Teller: negative = money out (expense), positive = money in (income)
        const amount = Math.round(parseFloat(txn.amount) * 100);
        const dateStr = txn.date;

        const dedupHash = createHash("sha256")
          .update(`${dateStr}|${amount}|${rawMerchant}|${account.id}`)
          .digest("hex");

        // Skip if exists
        const existing = await prisma.transaction.findUnique({
          where: { dedupHash },
        });

        if (existing) {
          totalSkipped++;
          continue;
        }

        const categoryId = await categorizeTransaction(merchant, rawMerchant);

        await prisma.transaction.create({
          data: {
            date: new Date(dateStr),
            amount,
            merchant,
            rawMerchant,
            description: txn.description || "",
            accountId: account.id,
            dedupHash,
            categoryId,
          },
        });

        totalImported++;
      }
    }

    return NextResponse.json({
      imported: totalImported,
      skipped: totalSkipped,
      synced: accounts.length,
    });
  } catch (error) {
    console.error("Teller sync error:", error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
