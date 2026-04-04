import Papa from "papaparse";
import { createHash } from "crypto";
import { normalizeMerchant } from "./utils";

export interface RawCSVRow {
  [key: string]: string;
}

export interface ColumnMapping {
  date: string;
  amount: string;
  merchant: string;
  description?: string;
}

export interface ParsedTransaction {
  date: string;
  amount: number; // in cents
  merchant: string;
  rawMerchant: string;
  description: string;
  dedupHash: string;
}

export function parseCSV(csvText: string): { headers: string[]; rows: RawCSVRow[] } {
  const result = Papa.parse<RawCSVRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  const headers = result.meta.fields ?? [];
  return { headers, rows: result.data };
}

export function guessColumnMapping(headers: string[]): Partial<ColumnMapping> {
  const mapping: Partial<ColumnMapping> = {};
  const lower = headers.map((h) => h.toLowerCase());

  // Date
  const dateIdx = lower.findIndex((h) =>
    ["date", "transaction date", "trans date", "posted date", "posting date"].includes(h)
  );
  if (dateIdx >= 0) mapping.date = headers[dateIdx];

  // Amount
  const amountIdx = lower.findIndex((h) =>
    ["amount", "transaction amount", "debit", "credit"].includes(h)
  );
  if (amountIdx >= 0) mapping.amount = headers[amountIdx];

  // Merchant
  const merchantIdx = lower.findIndex((h) =>
    ["description", "merchant", "name", "payee", "transaction description", "memo"].includes(h)
  );
  if (merchantIdx >= 0) mapping.merchant = headers[merchantIdx];

  // Description (secondary field)
  const descIdx = lower.findIndex(
    (h, i) =>
      i !== merchantIdx &&
      ["description", "memo", "notes", "category", "reference"].includes(h)
  );
  if (descIdx >= 0) mapping.description = headers[descIdx];

  return mapping;
}

export function mapRowsToTransactions(
  rows: RawCSVRow[],
  mapping: ColumnMapping,
  accountId: string
): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];

  for (const row of rows) {
    const rawDate = row[mapping.date]?.trim();
    const rawAmount = row[mapping.amount]?.trim();
    const rawMerchant = row[mapping.merchant]?.trim();
    const description = mapping.description ? (row[mapping.description]?.trim() ?? "") : "";

    if (!rawDate || !rawAmount || !rawMerchant) continue;

    // Parse date
    const date = new Date(rawDate);
    if (isNaN(date.getTime())) continue;
    const dateStr = date.toISOString().split("T")[0];

    // Parse amount to cents
    const cleanedAmount = rawAmount.replace(/[$,\s]/g, "");
    const amountDollars = parseFloat(cleanedAmount);
    if (isNaN(amountDollars)) continue;
    const amount = Math.round(amountDollars * 100);

    const merchant = normalizeMerchant(rawMerchant);

    const dedupHash = createHash("sha256")
      .update(`${dateStr}|${amount}|${rawMerchant}|${accountId}`)
      .digest("hex");

    transactions.push({
      date: dateStr,
      amount,
      merchant,
      rawMerchant,
      description,
      dedupHash,
    });
  }

  return transactions;
}
