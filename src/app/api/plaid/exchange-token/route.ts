import { NextRequest, NextResponse } from "next/server";
import { plaidClient } from "@/lib/plaid";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { public_token } = await req.json();

    // Exchange public token for access token
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token,
    });

    const accessToken = exchangeResponse.data.access_token;
    const itemId = exchangeResponse.data.item_id;

    // Get account details from Plaid
    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    });

    const createdAccounts = [];

    for (const plaidAccount of accountsResponse.data.accounts) {
      const accountType =
        plaidAccount.type === "credit" ? "credit_card" :
        plaidAccount.subtype === "savings" ? "savings" : "checking";

      const balance = Math.round(
        (plaidAccount.balances.current ?? 0) * 100
      );

      // Check if account already linked
      const existing = await prisma.account.findFirst({
        where: { plaidAccountId: plaidAccount.account_id },
      });

      if (existing) {
        await prisma.account.update({
          where: { id: existing.id },
          data: {
            currentBalance: balance,
            plaidAccessToken: accessToken,
            lastSynced: new Date(),
          },
        });
        createdAccounts.push(existing);
      } else {
        const account = await prisma.account.create({
          data: {
            name: plaidAccount.name || `${accountType} account`,
            type: accountType,
            currentBalance: balance,
            plaidAccessToken: accessToken,
            plaidAccountId: plaidAccount.account_id,
            plaidItemId: itemId,
            lastSynced: new Date(),
          },
        });
        createdAccounts.push(account);
      }
    }

    return NextResponse.json({
      accounts: createdAccounts.length,
      itemId,
    });
  } catch (error) {
    console.error("Plaid token exchange error:", error);
    return NextResponse.json({ error: "Failed to connect bank" }, { status: 500 });
  }
}
