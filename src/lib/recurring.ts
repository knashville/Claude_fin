import { prisma } from "./db";

interface MerchantGroup {
  merchant: string;
  transactions: { date: Date; amount: number }[];
}

function detectInterval(dates: Date[]): { interval: string; confidence: number } | null {
  if (dates.length < 2) return null;

  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
  const gaps: number[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const diffDays = (sorted[i].getTime() - sorted[i - 1].getTime()) / (1000 * 60 * 60 * 24);
    gaps.push(diffDays);
  }

  const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;

  // Check consistency - how close are all gaps to the average?
  const maxDeviation = Math.max(...gaps.map((g) => Math.abs(g - avgGap)));
  const relativeDeviation = maxDeviation / avgGap;

  // If gaps vary by more than 40%, not recurring
  if (relativeDeviation > 0.4) return null;

  let interval: string;
  let confidence: number;

  if (avgGap <= 10) {
    interval = "weekly";
    confidence = 1 - Math.abs(avgGap - 7) / 7;
  } else if (avgGap <= 18) {
    interval = "biweekly";
    confidence = 1 - Math.abs(avgGap - 14) / 14;
  } else if (avgGap <= 45) {
    interval = "monthly";
    confidence = 1 - Math.abs(avgGap - 30) / 30;
  } else if (avgGap <= 120) {
    interval = "quarterly";
    confidence = 1 - Math.abs(avgGap - 90) / 90;
  } else if (avgGap <= 400) {
    interval = "yearly";
    confidence = 1 - Math.abs(avgGap - 365) / 365;
  } else {
    return null;
  }

  confidence = Math.max(0, Math.min(1, confidence));
  // Boost confidence for more data points
  if (dates.length >= 4) confidence = Math.min(1, confidence + 0.1);

  return { interval, confidence };
}

function estimateNextDate(lastDate: Date, interval: string): Date {
  const next = new Date(lastDate);
  switch (interval) {
    case "weekly": next.setDate(next.getDate() + 7); break;
    case "biweekly": next.setDate(next.getDate() + 14); break;
    case "monthly": next.setMonth(next.getMonth() + 1); break;
    case "quarterly": next.setMonth(next.getMonth() + 3); break;
    case "yearly": next.setFullYear(next.getFullYear() + 1); break;
  }
  return next;
}

export async function detectRecurringPatterns(): Promise<number> {
  // Get all transactions grouped by merchant
  const transactions = await prisma.transaction.findMany({
    where: { amount: { lt: 0 } }, // expenses only
    orderBy: { date: "asc" },
  });

  const groups: Record<string, MerchantGroup> = {};
  for (const txn of transactions) {
    const key = txn.merchant.toLowerCase();
    if (!groups[key]) {
      groups[key] = { merchant: txn.merchant, transactions: [] };
    }
    groups[key].transactions.push({ date: txn.date, amount: txn.amount });
  }

  let detected = 0;

  for (const group of Object.values(groups)) {
    if (group.transactions.length < 2) continue;

    // Check if amounts are similar (within 20%)
    const amounts = group.transactions.map((t) => Math.abs(t.amount));
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const maxAmountDev = Math.max(...amounts.map((a) => Math.abs(a - avgAmount)));
    if (maxAmountDev / avgAmount > 0.2) continue;

    const dates = group.transactions.map((t) => t.date);
    const result = detectInterval(dates);
    if (!result || result.confidence < 0.4) continue;

    const lastDate = dates[dates.length - 1];
    const nextExpected = estimateNextDate(lastDate, result.interval);

    // Upsert pattern
    const existing = await prisma.recurringPattern.findFirst({
      where: { merchant: group.merchant },
    });

    if (existing) {
      await prisma.recurringPattern.update({
        where: { id: existing.id },
        data: {
          averageAmount: Math.round(avgAmount),
          interval: result.interval,
          confidence: result.confidence,
          lastSeen: lastDate,
          nextExpected,
          transactionCount: group.transactions.length,
        },
      });
    } else {
      await prisma.recurringPattern.create({
        data: {
          merchant: group.merchant,
          averageAmount: Math.round(avgAmount),
          interval: result.interval,
          confidence: result.confidence,
          lastSeen: lastDate,
          nextExpected,
          transactionCount: group.transactions.length,
        },
      });
    }
    detected++;
  }

  return detected;
}
