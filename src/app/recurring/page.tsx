"use client";

import { useState, useEffect } from "react";
import { formatCents, formatDate } from "@/lib/utils";

interface RecurringPattern {
  id: string;
  merchant: string;
  averageAmount: number;
  interval: string;
  confidence: number;
  lastSeen: string;
  nextExpected: string | null;
  isConfirmed: boolean;
  transactionCount: number;
}

export default function RecurringPage() {
  const [patterns, setPatterns] = useState<RecurringPattern[]>([]);
  const [detecting, setDetecting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchPatterns = () => {
    fetch("/api/recurring").then((r) => r.json()).then(setPatterns);
  };

  useEffect(() => { fetchPatterns(); }, []);

  const runDetection = async () => {
    setDetecting(true);
    setMessage(null);
    const res = await fetch("/api/recurring", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "detect" }),
    });
    const data = await res.json();
    setMessage(`Found ${data.detected} recurring patterns`);
    setDetecting(false);
    fetchPatterns();
  };

  const confirmPattern = async (id: string) => {
    await fetch("/api/recurring", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "confirm", id }),
    });
    fetchPatterns();
  };

  const dismissPattern = async (id: string) => {
    await fetch("/api/recurring", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "dismiss", id }),
    });
    fetchPatterns();
  };

  const monthlyTotal = patterns
    .filter((p) => p.isConfirmed || p.confidence >= 0.6)
    .reduce((sum, p) => {
      const monthly =
        p.interval === "weekly" ? p.averageAmount * 4.33 :
        p.interval === "biweekly" ? p.averageAmount * 2.17 :
        p.interval === "quarterly" ? p.averageAmount / 3 :
        p.interval === "yearly" ? p.averageAmount / 12 :
        p.averageAmount;
      return sum + monthly;
    }, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold">Recurring Charges</h2>
          <p className="text-sm text-[var(--muted)]">Subscriptions and recurring bills</p>
        </div>
        <button
          onClick={runDetection}
          disabled={detecting}
          className="px-4 py-2 text-sm bg-[var(--accent)] text-white rounded-md hover:opacity-90 disabled:opacity-50"
        >
          {detecting ? "Detecting..." : "Detect Patterns"}
        </button>
      </div>

      {message && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          {message}
        </div>
      )}

      {/* Monthly total */}
      {patterns.length > 0 && (
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg p-5 mb-6">
          <p className="text-sm text-[var(--muted)]">Estimated Monthly Recurring</p>
          <p className="text-2xl font-semibold mt-1">{formatCents(Math.round(monthlyTotal))}</p>
        </div>
      )}

      {/* Patterns list */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-zinc-50">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--muted)]">Merchant</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--muted)]">Amount</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--muted)]">Frequency</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--muted)]">Last Seen</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--muted)]">Next Expected</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--muted)]">Status</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-[var(--muted)]"></th>
            </tr>
          </thead>
          <tbody>
            {patterns.map((p) => (
              <tr key={p.id} className="border-b border-[var(--border)] last:border-0">
                <td className="px-4 py-2.5 font-medium">{p.merchant}</td>
                <td className="px-4 py-2.5">{formatCents(p.averageAmount)}</td>
                <td className="px-4 py-2.5 capitalize text-[var(--muted)]">{p.interval}</td>
                <td className="px-4 py-2.5 text-xs text-[var(--muted)]">{formatDate(p.lastSeen)}</td>
                <td className="px-4 py-2.5 text-xs text-[var(--muted)]">
                  {p.nextExpected ? formatDate(p.nextExpected) : "—"}
                </td>
                <td className="px-4 py-2.5">
                  {p.isConfirmed ? (
                    <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">Confirmed</span>
                  ) : (
                    <span className="text-xs text-[var(--muted)]">
                      {Math.round(p.confidence * 100)}% confidence
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <div className="flex gap-2 justify-end">
                    {!p.isConfirmed && (
                      <button
                        onClick={() => confirmPattern(p.id)}
                        className="text-xs text-green-600 hover:text-green-800"
                      >
                        Confirm
                      </button>
                    )}
                    <button
                      onClick={() => dismissPattern(p.id)}
                      className="text-xs text-red-400 hover:text-red-600"
                    >
                      Dismiss
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {patterns.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[var(--muted)]">
                  No recurring patterns detected. Click &quot;Detect Patterns&quot; to scan your transactions.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
