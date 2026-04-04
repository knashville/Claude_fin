import { PrismaClient } from "@prisma/client";
import { createHash } from "crypto";

const prisma = new PrismaClient();

function dedupHash(date: string, amount: number, rawMerchant: string, accountId: string): string {
  return createHash("sha256")
    .update(`${date}|${amount}|${rawMerchant}|${accountId}`)
    .digest("hex");
}

async function main() {
  // Default categories
  const categories = [
    { name: "Groceries", color: "#10B981", icon: "shopping-cart" },
    { name: "Dining", color: "#F59E0B", icon: "utensils" },
    { name: "Transport", color: "#3B82F6", icon: "car" },
    { name: "Housing", color: "#8B5CF6", icon: "home" },
    { name: "Utilities", color: "#6366F1", icon: "zap" },
    { name: "Subscriptions", color: "#EC4899", icon: "repeat" },
    { name: "Shopping", color: "#F97316", icon: "bag" },
    { name: "Health", color: "#14B8A6", icon: "heart" },
    { name: "Entertainment", color: "#A855F7", icon: "film" },
    { name: "Travel", color: "#06B6D4", icon: "plane" },
    { name: "Income", color: "#22C55E", icon: "dollar-sign", isIncome: true },
    { name: "Transfer", color: "#94A3B8", icon: "arrow-right" },
    { name: "Other", color: "#6B7280", icon: "tag" },
  ];

  const categoryMap: Record<string, string> = {};
  for (const cat of categories) {
    const created = await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
    categoryMap[cat.name] = created.id;
  }

  // Sample account
  const account = await prisma.account.upsert({
    where: { id: "sample-checking" },
    update: {},
    create: {
      id: "sample-checking",
      name: "Main Checking",
      type: "checking",
      currentBalance: 542317, // $5,423.17
    },
  });

  // Sample categorization rules
  const rules = [
    { pattern: "SPOTIFY", matchType: "contains", categoryName: "Subscriptions" },
    { pattern: "NETFLIX", matchType: "contains", categoryName: "Subscriptions" },
    { pattern: "TRADER JOE", matchType: "contains", categoryName: "Groceries" },
    { pattern: "WHOLE FOODS", matchType: "contains", categoryName: "Groceries" },
    { pattern: "UBER EATS", matchType: "contains", categoryName: "Dining" },
    { pattern: "DOORDASH", matchType: "contains", categoryName: "Dining" },
    { pattern: "COMCAST", matchType: "contains", categoryName: "Utilities" },
    { pattern: "PG&E", matchType: "contains", categoryName: "Utilities" },
    { pattern: "UBER TRIP", matchType: "contains", categoryName: "Transport" },
    { pattern: "LYFT", matchType: "contains", categoryName: "Transport" },
  ];

  for (const rule of rules) {
    await prisma.categorizationRule.create({
      data: {
        pattern: rule.pattern,
        matchType: rule.matchType,
        field: "merchant",
        categoryId: categoryMap[rule.categoryName],
        priority: 10,
      },
    });
  }

  // Sample transactions (last 2 months)
  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const sampleTransactions = [
    // This month
    { daysAgo: 1, amount: -4532, merchant: "Trader Joe's", raw: "TRADER JOE'S #123", cat: "Groceries" },
    { daysAgo: 2, amount: -1599, merchant: "Spotify", raw: "SPOTIFY USA", cat: "Subscriptions" },
    { daysAgo: 3, amount: -2847, merchant: "Shell Gas", raw: "SHELL OIL 57442", cat: "Transport" },
    { daysAgo: 4, amount: -8900, merchant: "Whole Foods", raw: "WHOLE FOODS MKT #10234", cat: "Groceries" },
    { daysAgo: 5, amount: -3200, merchant: "Uber Eats", raw: "UBER EATS PENDING", cat: "Dining" },
    { daysAgo: 6, amount: 350000, merchant: "Payroll", raw: "ACME CORP PAYROLL", cat: "Income" },
    { daysAgo: 7, amount: -15499, merchant: "Netflix", raw: "NETFLIX.COM", cat: "Subscriptions" },
    { daysAgo: 8, amount: -125000, merchant: "Rent", raw: "ZELLE TO LANDLORD", cat: "Housing" },
    { daysAgo: 9, amount: -4299, merchant: "Amazon", raw: "AMAZON.COM*1A2B3C", cat: "Shopping" },
    { daysAgo: 10, amount: -1875, merchant: "Chipotle", raw: "CHIPOTLE ONLINE", cat: "Dining" },
    { daysAgo: 12, amount: -7500, merchant: "Comcast", raw: "COMCAST CABLE COMM", cat: "Utilities" },
    { daysAgo: 14, amount: -2100, merchant: "Starbucks", raw: "STARBUCKS #9832", cat: "Dining" },
    { daysAgo: 15, amount: -6750, merchant: "Trader Joe's", raw: "TRADER JOE'S #123", cat: "Groceries" },
    // Last month
    { daysAgo: 32, amount: -4100, merchant: "Trader Joe's", raw: "TRADER JOE'S #123", cat: "Groceries" },
    { daysAgo: 33, amount: -1599, merchant: "Spotify", raw: "SPOTIFY USA", cat: "Subscriptions" },
    { daysAgo: 34, amount: -3100, merchant: "Shell Gas", raw: "SHELL OIL 57442", cat: "Transport" },
    { daysAgo: 35, amount: -7800, merchant: "Whole Foods", raw: "WHOLE FOODS MKT #10234", cat: "Groceries" },
    { daysAgo: 36, amount: 350000, merchant: "Payroll", raw: "ACME CORP PAYROLL", cat: "Income" },
    { daysAgo: 37, amount: -15499, merchant: "Netflix", raw: "NETFLIX.COM", cat: "Subscriptions" },
    { daysAgo: 38, amount: -125000, merchant: "Rent", raw: "ZELLE TO LANDLORD", cat: "Housing" },
    { daysAgo: 40, amount: -5600, merchant: "Target", raw: "TARGET 00012345", cat: "Shopping" },
    { daysAgo: 42, amount: -7500, merchant: "Comcast", raw: "COMCAST CABLE COMM", cat: "Utilities" },
    { daysAgo: 44, amount: -2500, merchant: "Lyft", raw: "LYFT *RIDE 12345", cat: "Transport" },
    { daysAgo: 45, amount: -1900, merchant: "Starbucks", raw: "STARBUCKS #9832", cat: "Dining" },
    { daysAgo: 48, amount: -9999, merchant: "Amazon", raw: "AMAZON.COM*4D5E6F", cat: "Shopping" },
  ];

  for (const tx of sampleTransactions) {
    const date = new Date();
    date.setDate(date.getDate() - tx.daysAgo);
    date.setHours(12, 0, 0, 0);
    const dateStr = date.toISOString().split("T")[0];
    const hash = dedupHash(dateStr, tx.amount, tx.raw, account.id);

    await prisma.transaction.upsert({
      where: { dedupHash: hash },
      update: {},
      create: {
        date,
        amount: tx.amount,
        merchant: tx.merchant,
        rawMerchant: tx.raw,
        categoryId: categoryMap[tx.cat],
        accountId: account.id,
        dedupHash: hash,
      },
    });
  }

  // Default settings
  await prisma.settings.upsert({
    where: { key: "app_name" },
    update: {},
    create: { key: "app_name", value: "ClearBooks" },
  });

  await prisma.settings.upsert({
    where: { key: "setup_complete" },
    update: {},
    create: { key: "setup_complete", value: "false" },
  });

  console.log("Seed complete: 13 categories, 1 account, 25 transactions, 10 rules");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
