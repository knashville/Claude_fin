export function formatCents(cents: number): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(dollars);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateShort(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function normalizeMerchant(raw: string): string {
  let cleaned = raw.trim();
  // Remove common suffixes like transaction IDs, store numbers
  cleaned = cleaned.replace(/\s*#\d+$/i, "");
  cleaned = cleaned.replace(/\s*\*[\w\d]+$/i, "");
  cleaned = cleaned.replace(/\s+(PENDING|AUTHORIZED|CHECKCARD|POS|DEBIT)$/i, "");
  cleaned = cleaned.replace(/\s+\d{4,}$/i, "");
  // Title case
  cleaned = cleaned
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return cleaned;
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function getMonthRange(date: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export function getPreviousMonthRange(date: Date = new Date()): { start: Date; end: Date } {
  const prev = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  return getMonthRange(prev);
}
