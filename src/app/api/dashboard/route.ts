import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getMonthRange, getPreviousMonthRange } from "@/lib/utils";

export async function GET() {
  const { start: thisStart, end: thisEnd } = getMonthRange();
  const { start: prevStart, end: prevEnd } = getPreviousMonthRange();

  // This month's transactions
  const thisMonthTxns = await prisma.transaction.findMany({
    where: { date: { gte: thisStart, lte: thisEnd } },
    include: { category: true },
    orderBy: { date: "desc" },
  });

  // Last month's transactions
  const lastMonthTxns = await prisma.transaction.findMany({
    where: { date: { gte: prevStart, lte: prevEnd } },
    include: { category: true },
  });

  // Calculate totals
  const thisMonthIncome = thisMonthTxns
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);
  const thisMonthExpenses = thisMonthTxns
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const lastMonthIncome = lastMonthTxns
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);
  const lastMonthExpenses = lastMonthTxns
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  // Top spending categories this month
  const categorySpending: Record<string, { name: string; color: string; total: number }> = {};
  for (const t of thisMonthTxns) {
    if (t.amount < 0 && t.category) {
      const key = t.category.id;
      if (!categorySpending[key]) {
        categorySpending[key] = { name: t.category.name, color: t.category.color, total: 0 };
      }
      categorySpending[key].total += Math.abs(t.amount);
    }
  }
  const topCategories = Object.values(categorySpending)
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  // Recent transactions (last 10)
  const recentTransactions = thisMonthTxns.slice(0, 10).map((t) => ({
    id: t.id,
    date: t.date,
    merchant: t.merchant,
    amount: t.amount,
    categoryName: t.category?.name ?? "Uncategorized",
    categoryColor: t.category?.color ?? "#6B7280",
  }));

  // Account balances
  const accounts = await prisma.account.findMany();

  // Recurring patterns
  const recurring = await prisma.recurringPattern.findMany({
    where: { isDismissed: false },
    orderBy: { nextExpected: "asc" },
    take: 5,
  });

  return NextResponse.json({
    thisMonth: {
      income: thisMonthIncome,
      expenses: thisMonthExpenses,
      net: thisMonthIncome - thisMonthExpenses,
    },
    lastMonth: {
      income: lastMonthIncome,
      expenses: lastMonthExpenses,
      net: lastMonthIncome - lastMonthExpenses,
    },
    topCategories,
    recentTransactions,
    accounts,
    recurring,
  });
}
