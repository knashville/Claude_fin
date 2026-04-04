import { prisma } from "@/lib/db";
import { getMonthRange, getPreviousMonthRange, formatCents, formatDateShort } from "@/lib/utils";

async function getDashboardData() {
  const { start: thisStart, end: thisEnd } = getMonthRange();
  const { start: prevStart, end: prevEnd } = getPreviousMonthRange();

  const [thisMonthTxns, lastMonthTxns, accounts, recurring] = await Promise.all([
    prisma.transaction.findMany({
      where: { date: { gte: thisStart, lte: thisEnd } },
      include: { category: true },
      orderBy: { date: "desc" },
    }),
    prisma.transaction.findMany({
      where: { date: { gte: prevStart, lte: prevEnd } },
      include: { category: true },
    }),
    prisma.account.findMany(),
    prisma.recurringPattern.findMany({
      where: { isDismissed: false },
      orderBy: { nextExpected: "asc" },
      take: 5,
    }),
  ]);

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

  const recentTransactions = thisMonthTxns.slice(0, 8);

  return {
    thisMonth: { income: thisMonthIncome, expenses: thisMonthExpenses, net: thisMonthIncome - thisMonthExpenses },
    lastMonth: { income: lastMonthIncome, expenses: lastMonthExpenses, net: lastMonthIncome - lastMonthExpenses },
    topCategories,
    recentTransactions,
    accounts,
    recurring,
  };
}

function TrendIndicator({ current, previous, isExpense }: { current: number; previous: number; isExpense?: boolean }) {
  if (previous === 0) return null;
  const pctChange = ((current - previous) / previous) * 100;
  const isGood = isExpense ? pctChange < 0 : pctChange > 0;
  const arrow = pctChange > 0 ? "↑" : "↓";
  return (
    <span className={`text-xs font-medium ${isGood ? "text-green-600" : "text-red-500"}`}>
      {arrow} {Math.abs(pctChange).toFixed(0)}% vs last month
    </span>
  );
}

export default async function Dashboard() {
  const data = await getDashboardData();
  const monthName = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">{monthName}</h2>
        <p className="text-sm text-[var(--muted)]">Your financial overview</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg p-5">
          <p className="text-sm text-[var(--muted)] mb-1">Income</p>
          <p className="text-2xl font-semibold text-green-600">{formatCents(data.thisMonth.income)}</p>
          <TrendIndicator current={data.thisMonth.income} previous={data.lastMonth.income} />
        </div>
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg p-5">
          <p className="text-sm text-[var(--muted)] mb-1">Spending</p>
          <p className="text-2xl font-semibold text-red-500">{formatCents(data.thisMonth.expenses)}</p>
          <TrendIndicator current={data.thisMonth.expenses} previous={data.lastMonth.expenses} isExpense />
        </div>
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg p-5">
          <p className="text-sm text-[var(--muted)] mb-1">Net</p>
          <p className={`text-2xl font-semibold ${data.thisMonth.net >= 0 ? "text-green-600" : "text-red-500"}`}>
            {formatCents(data.thisMonth.net)}
          </p>
          <TrendIndicator current={data.thisMonth.net} previous={data.lastMonth.net} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Categories */}
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg p-5">
          <h3 className="text-sm font-medium text-[var(--muted)] mb-4">Top Categories</h3>
          <div className="space-y-3">
            {data.topCategories.map((cat) => (
              <div key={cat.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="text-sm">{cat.name}</span>
                </div>
                <span className="text-sm font-medium">{formatCents(cat.total)}</span>
              </div>
            ))}
            {data.topCategories.length === 0 && (
              <p className="text-sm text-[var(--muted)]">No spending this month</p>
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="lg:col-span-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg p-5">
          <h3 className="text-sm font-medium text-[var(--muted)] mb-4">Recent Transactions</h3>
          <div className="space-y-2">
            {data.recentTransactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs text-[var(--muted)] w-12 shrink-0">
                    {formatDateShort(t.date)}
                  </span>
                  <span className="text-sm truncate">{t.merchant}</span>
                  {t.category && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded shrink-0"
                      style={{
                        backgroundColor: t.category.color + "20",
                        color: t.category.color,
                      }}
                    >
                      {t.category.name}
                    </span>
                  )}
                </div>
                <span
                  className={`text-sm font-medium shrink-0 ml-3 ${
                    t.amount >= 0 ? "text-green-600" : "text-zinc-900"
                  }`}
                >
                  {t.amount >= 0 ? "+" : ""}{formatCents(t.amount)}
                </span>
              </div>
            ))}
            {data.recentTransactions.length === 0 && (
              <p className="text-sm text-[var(--muted)]">No transactions this month</p>
            )}
          </div>
        </div>
      </div>

      {/* Account Balances */}
      {data.accounts.length > 0 && (
        <div className="mt-6 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg p-5">
          <h3 className="text-sm font-medium text-[var(--muted)] mb-4">Accounts</h3>
          <div className="flex gap-6">
            {data.accounts.map((a) => (
              <div key={a.id} className="flex items-center gap-3">
                <div>
                  <p className="text-sm font-medium">{a.name}</p>
                  <p className="text-xs text-[var(--muted)] capitalize">{a.type.replace("_", " ")}</p>
                </div>
                <p className="text-sm font-semibold">{formatCents(a.currentBalance)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recurring */}
      {data.recurring.length > 0 && (
        <div className="mt-6 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg p-5">
          <h3 className="text-sm font-medium text-[var(--muted)] mb-4">Upcoming Recurring</h3>
          <div className="space-y-2">
            {data.recurring.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-1">
                <div>
                  <span className="text-sm">{r.merchant}</span>
                  <span className="text-xs text-[var(--muted)] ml-2">{r.interval}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium">{formatCents(r.averageAmount)}</span>
                  {r.nextExpected && (
                    <span className="text-xs text-[var(--muted)] ml-2">
                      due {formatDateShort(r.nextExpected)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
