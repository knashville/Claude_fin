import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAccounts, getAccountBalances } from "@/lib/teller";

export async function POST(req: NextRequest) {
  try {
    const { accessToken, enrollmentId } = await req.json();

    if (!accessToken) {
      return NextResponse.json({ error: "Missing access token" }, { status: 400 });
    }

    // Fetch accounts from Teller
    const tellerAccounts = await getAccounts(accessToken);
    const createdAccounts = [];

    for (const ta of tellerAccounts) {
      const accountType =
        ta.type === "credit" ? "credit_card" :
        ta.subtype === "savings" ? "savings" : "checking";

      // Get balance
      let balanceCents = 0;
      try {
        const balance = await getAccountBalances(accessToken, ta.id);
        balanceCents = Math.round(parseFloat(balance.ledger) * 100);
      } catch {
        // Balance might not be available for all account types
      }

      // Check if already linked
      const existing = await prisma.account.findFirst({
        where: { plaidAccountId: ta.id },
      });

      if (existing) {
        await prisma.account.update({
          where: { id: existing.id },
          data: {
            currentBalance: balanceCents,
            plaidAccessToken: accessToken, // reusing plaid fields for teller
            lastSynced: new Date(),
          },
        });
        createdAccounts.push(existing);
      } else {
        const account = await prisma.account.create({
          data: {
            name: ta.name || `${ta.institution.name} ${accountType}`,
            type: accountType,
            currentBalance: balanceCents,
            plaidAccessToken: accessToken, // stores Teller access token
            plaidAccountId: ta.id, // stores Teller account ID
            plaidItemId: enrollmentId || ta.enrollment_id, // stores Teller enrollment ID
            lastSynced: new Date(),
          },
        });
        createdAccounts.push(account);
      }
    }

    return NextResponse.json({ accounts: createdAccounts.length });
  } catch (error) {
    console.error("Teller enrollment error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to connect bank" },
      { status: 500 }
    );
  }
}
