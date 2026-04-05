import { NextResponse } from "next/server";
import { plaidClient } from "@/lib/plaid";
import { prisma } from "@/lib/db";
import { createHash } from "crypto";
import { normalizeMerchant } from "@/lib/utils";
import { categorizeTransaction } from "@/lib/categorizer";

export async function POST() {
  try {
    // Get all Plaid-linked accounts
    const accounts = await prisma.account.findMany({
      where: { plaidAccessToken: { not: null } },
    });

    if (accounts.length === 0) {
      return NextResponse.json({ error: "No linked accounts" }, { status: 400 });
    }

    // Group accounts by access token (one token can have multiple accounts)
    const tokenGroups: Record<string, typeof accounts> = {};
    for (const account of accounts) {
      const token = account.plaidAccessToken!;
      if (!tokenGroups[token]) tokenGroups[token] = [];
      tokenGroups[token].push(account);
    }

    let totalImported = 0;
    let totalSkipped = 0;

    for (const [accessToken, groupAccounts] of Object.entries(tokenGroups)) {
      // Build account lookup by Plaid account ID
      const accountLookup: Record<string, string> = {};
      for (const acc of groupAccounts) {
        if (acc.plaidAccountId) {
          accountLookup[acc.plaidAccountId] = acc.id;
        }
      }

      // Sync transactions — pull last 30 days
      const now = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);

      const startDate = thirtyDaysAgo.toISOString().split("T")[0];
      const endDate = now.toISOString().split("T")[0];

      const txnResponse = await plaidClient.transactionsGet({
        access_token: accessToken,
        start_date: startDate,
        end_date: endDate,
        options: { count: 500, offset: 0 },
      });

      // Also update balances
      const balanceResponse = await plaidClient.accountsGet({
        access_token: accessToken,
      });

      for (const plaidAccount of balanceResponse.data.accounts) {
        const localAccountId = accountLookup[plaidAccount.account_id];
        if (localAccountId) {
          const balance = Math.round((plaidAccount.balances.current ?? 0) * 100);
          await prisma.account.update({
            where: { id: localAccountId },
            data: { currentBalance: balance, lastSynced: new Date() },
          });
        }
      }

      // Import transactions
      for (const txn of txnResponse.data.transactions) {
        const accountId = accountLookup[txn.account_id];
        if (!accountId) continue;

        const rawMerchant = txn.name || txn.merchant_name || "Unknown";
        const merchant = normalizeMerchant(rawMerchant);
        // Plaid amounts: positive = money leaving account (expense), negative = income
        const amount = Math.round(txn.amount * -100);
        const dateStr = txn.date;

        const dedupHash = createHash("sha256")
          .update(`${dateStr}|${amount}|${rawMerchant}|${accountId}`)
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
            description: txn.category?.join(", ") ?? "",
            accountId,
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
    console.error("Plaid sync error:", error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
