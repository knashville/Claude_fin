import { prisma } from "./db";

export async function categorizeTransaction(
  merchant: string,
  rawMerchant: string
): Promise<string | null> {
  const rules = await prisma.categorizationRule.findMany({
    orderBy: { priority: "desc" },
  });

  for (const rule of rules) {
    const field = rule.field === "rawMerchant" ? rawMerchant : merchant;
    const pattern = rule.pattern.toLowerCase();
    const value = field.toLowerCase();

    let matches = false;
    switch (rule.matchType) {
      case "contains":
        matches = value.includes(pattern);
        break;
      case "startsWith":
        matches = value.startsWith(pattern);
        break;
      case "exact":
        matches = value === pattern;
        break;
    }

    if (matches) {
      return rule.categoryId;
    }
  }

  return null;
}

export async function recategorizeAll(): Promise<number> {
  const transactions = await prisma.transaction.findMany({
    where: { isManualCategory: false },
  });

  let updated = 0;
  for (const txn of transactions) {
    const categoryId = await categorizeTransaction(txn.merchant, txn.rawMerchant);
    if (categoryId && categoryId !== txn.categoryId) {
      await prisma.transaction.update({
        where: { id: txn.id },
        data: { categoryId },
      });
      updated++;
    }
  }

  return updated;
}
