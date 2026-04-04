"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCents, formatDate } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Transaction {
  id: string;
  date: string;
  amount: number;
  merchant: string;
  rawMerchant: string;
  description: string;
  categoryId: string | null;
  category: Category | null;
  account: { name: string };
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const limit = 50;

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set("search", search);
    if (filterCategory) params.set("categoryId", filterCategory);

    const res = await fetch(`/api/transactions?${params}`);
    const data = await res.json();
    setTransactions(data.transactions);
    setTotal(data.total);
    setLoading(false);
  }, [page, search, filterCategory]);

  useEffect(() => {
    fetch("/api/categories").then((r) => r.json()).then(setCategories);
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const updateCategory = async (txnId: string, categoryId: string) => {
    await fetch(`/api/transactions/${txnId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId: categoryId || null }),
    });
    fetchTransactions();
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">Transactions</h2>
        <p className="text-sm text-[var(--muted)]">{total} transactions</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Search merchants, descriptions..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 max-w-sm border border-[var(--border)] rounded-md px-3 py-2 text-sm bg-white"
        />
        <select
          value={filterCategory}
          onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
          className="border border-[var(--border)] rounded-md px-3 py-2 text-sm bg-white"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Transaction Table */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-zinc-50">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--muted)]">Date</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--muted)]">Merchant</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--muted)]">Category</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--muted)]">Account</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-[var(--muted)]">Amount</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[var(--muted)]">Loading...</td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[var(--muted)]">No transactions found</td>
              </tr>
            ) : (
              transactions.map((t) => (
                <tr key={t.id} className="border-b border-[var(--border)] hover:bg-zinc-50 transition-colors">
                  <td className="px-4 py-2.5 text-xs text-[var(--muted)] whitespace-nowrap">
                    {formatDate(t.date)}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="font-medium">{t.merchant}</div>
                    {t.rawMerchant !== t.merchant && (
                      <div className="text-xs text-[var(--muted)] truncate max-w-[200px]">{t.rawMerchant}</div>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <select
                      value={t.categoryId ?? ""}
                      onChange={(e) => updateCategory(t.id, e.target.value)}
                      className="text-xs border border-transparent hover:border-[var(--border)] rounded px-1.5 py-0.5 bg-transparent cursor-pointer"
                      style={t.category ? {
                        backgroundColor: t.category.color + "15",
                        color: t.category.color,
                      } : {}}
                    >
                      <option value="">Uncategorized</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[var(--muted)]">{t.account.name}</td>
                  <td className={`px-4 py-2.5 text-right font-medium ${t.amount >= 0 ? "text-green-600" : ""}`}>
                    {t.amount >= 0 ? "+" : ""}{formatCents(t.amount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-[var(--muted)]">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1.5 text-xs border border-[var(--border)] rounded-md disabled:opacity-50 hover:bg-zinc-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-xs border border-[var(--border)] rounded-md disabled:opacity-50 hover:bg-zinc-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
