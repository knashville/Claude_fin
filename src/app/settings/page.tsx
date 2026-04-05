"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCents } from "@/lib/utils";

interface Account {
  id: string;
  name: string;
  type: string;
  currentBalance: number;
  plaidAccountId: string | null;
  lastSynced: string | null;
}

declare global {
  interface Window {
    Plaid?: {
      create: (config: Record<string, unknown>) => { open: () => void };
    };
  }
}

export default function SettingsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [newAccountName, setNewAccountName] = useState("");
  const [newAccountType, setNewAccountType] = useState("checking");
  const [password, setPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");
  const [editingBalance, setEditingBalance] = useState<string | null>(null);
  const [balanceInput, setBalanceInput] = useState("");
  const [plaidLoading, setPlaidLoading] = useState(false);
  const [plaidMsg, setPlaidMsg] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");

  const fetchData = () => {
    fetch("/api/accounts").then((r) => r.json()).then(setAccounts);
    fetch("/api/settings").then((r) => r.json()).then(setSettings);
  };

  useEffect(() => { fetchData(); }, []);

  // Load Plaid Link script
  useEffect(() => {
    if (document.getElementById("plaid-link-script")) return;
    const script = document.createElement("script");
    script.id = "plaid-link-script";
    script.src = "https://cdn.plaid.com/link/v2/stable/link-initialize.js";
    script.async = true;
    document.head.appendChild(script);
  }, []);

  const connectBank = useCallback(async () => {
    setPlaidLoading(true);
    setPlaidMsg("");

    try {
      const res = await fetch("/api/plaid/create-link-token", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setPlaidMsg(data.error || "Failed to start bank connection");
        setPlaidLoading(false);
        return;
      }

      if (!window.Plaid) {
        setPlaidMsg("Plaid Link is still loading. Try again in a moment.");
        setPlaidLoading(false);
        return;
      }

      const handler = window.Plaid.create({
        token: data.link_token,
        onSuccess: async (publicToken: string) => {
          const exchangeRes = await fetch("/api/plaid/exchange-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ public_token: publicToken }),
          });
          const exchangeData = await exchangeRes.json();

          if (exchangeRes.ok) {
            setPlaidMsg(`Connected ${exchangeData.accounts} account(s). Syncing transactions...`);
            // Auto-sync after connecting
            const syncRes = await fetch("/api/plaid/sync", { method: "POST" });
            const syncData = await syncRes.json();
            if (syncRes.ok) {
              setPlaidMsg(`Connected ${exchangeData.accounts} account(s). Imported ${syncData.imported} transactions.`);
            }
            fetchData();
          } else {
            setPlaidMsg(exchangeData.error || "Failed to connect");
          }
          setPlaidLoading(false);
        },
        onExit: () => {
          setPlaidLoading(false);
        },
      });

      handler.open();
    } catch {
      setPlaidMsg("Failed to connect bank");
      setPlaidLoading(false);
    }
  }, []);

  const syncTransactions = async () => {
    setSyncing(true);
    setSyncMsg("");
    try {
      const res = await fetch("/api/plaid/sync", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setSyncMsg(`Synced: ${data.imported} new, ${data.skipped} duplicates skipped`);
        fetchData();
      } else {
        setSyncMsg(data.error || "Sync failed");
      }
    } catch {
      setSyncMsg("Sync failed");
    }
    setSyncing(false);
  };

  const addAccount = async () => {
    if (!newAccountName.trim()) return;
    await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newAccountName.trim(), type: newAccountType }),
    });
    setNewAccountName("");
    fetchData();
  };

  const updateBalance = async (id: string) => {
    const cents = Math.round(parseFloat(balanceInput) * 100);
    if (isNaN(cents)) return;
    await fetch(`/api/accounts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentBalance: cents }),
    });
    setEditingBalance(null);
    fetchData();
  };

  const deleteAccount = async (id: string) => {
    if (!confirm("Delete this account?")) return;
    const res = await fetch(`/api/accounts/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error);
      return;
    }
    fetchData();
  };

  const setPasswordHandler = async () => {
    if (!password || password.length < 4) {
      setPasswordMsg("Password must be at least 4 characters");
      return;
    }
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_password", password }),
    });
    setPassword("");
    setPasswordMsg("Password updated");
    fetchData();
  };

  const hasLinkedAccounts = accounts.some((a) => a.plaidAccountId);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">Settings</h2>
        <p className="text-sm text-[var(--muted)]">Manage accounts and app settings</p>
      </div>

      {/* Bank Connection */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg p-5 mb-6">
        <h3 className="text-sm font-medium mb-2">Bank Connection</h3>
        <p className="text-xs text-[var(--muted)] mb-4">
          Connect your bank accounts to automatically sync transactions via Plaid.
        </p>

        <div className="flex gap-3">
          <button
            onClick={connectBank}
            disabled={plaidLoading}
            className="px-4 py-2 text-sm bg-[var(--accent)] text-white rounded-md hover:opacity-90 disabled:opacity-50"
          >
            {plaidLoading ? "Connecting..." : "Connect a Bank"}
          </button>
          {hasLinkedAccounts && (
            <button
              onClick={syncTransactions}
              disabled={syncing}
              className="px-4 py-2 text-sm border border-[var(--border)] rounded-md hover:bg-zinc-50 disabled:opacity-50"
            >
              {syncing ? "Syncing..." : "Sync Now"}
            </button>
          )}
        </div>

        {plaidMsg && (
          <p className="text-xs mt-3 text-green-600">{plaidMsg}</p>
        )}
        {syncMsg && (
          <p className="text-xs mt-3 text-blue-600">{syncMsg}</p>
        )}
      </div>

      {/* Accounts */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg p-5 mb-6">
        <h3 className="text-sm font-medium mb-4">Accounts</h3>

        <div className="space-y-3 mb-4">
          {accounts.map((a) => (
            <div key={a.id} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
              <div>
                <span className="text-sm font-medium">{a.name}</span>
                <span className="text-xs text-[var(--muted)] ml-2 capitalize">{a.type.replace("_", " ")}</span>
                {a.plaidAccountId && (
                  <span className="text-xs text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded ml-2">linked</span>
                )}
                {a.lastSynced && (
                  <span className="text-xs text-[var(--muted)] ml-2">
                    synced {new Date(a.lastSynced).toLocaleDateString()}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {editingBalance === a.id ? (
                  <div className="flex items-center gap-1">
                    <span className="text-sm">$</span>
                    <input
                      value={balanceInput}
                      onChange={(e) => setBalanceInput(e.target.value)}
                      className="w-24 border border-[var(--border)] rounded px-2 py-1 text-sm"
                      onKeyDown={(e) => e.key === "Enter" && updateBalance(a.id)}
                      autoFocus
                    />
                    <button onClick={() => updateBalance(a.id)} className="text-xs text-[var(--accent)]">Save</button>
                    <button onClick={() => setEditingBalance(null)} className="text-xs text-[var(--muted)]">Cancel</button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setEditingBalance(a.id); setBalanceInput((a.currentBalance / 100).toFixed(2)); }}
                    className="text-sm font-medium hover:text-[var(--accent)]"
                  >
                    {formatCents(a.currentBalance)}
                  </button>
                )}
                <button onClick={() => deleteAccount(a.id)} className="text-xs text-red-400 hover:text-red-600">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 items-end pt-3 border-t border-[var(--border)]">
          <div className="flex-1">
            <label className="block text-xs font-medium mb-1">Account Name</label>
            <input
              value={newAccountName}
              onChange={(e) => setNewAccountName(e.target.value)}
              placeholder="e.g. Chase Checking"
              className="w-full border border-[var(--border)] rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Type</label>
            <select
              value={newAccountType}
              onChange={(e) => setNewAccountType(e.target.value)}
              className="border border-[var(--border)] rounded-md px-3 py-2 text-sm bg-white"
            >
              <option value="checking">Checking</option>
              <option value="savings">Savings</option>
              <option value="credit_card">Credit Card</option>
            </select>
          </div>
          <button
            onClick={addAccount}
            className="px-4 py-2 text-sm bg-[var(--accent)] text-white rounded-md hover:opacity-90"
          >
            Add
          </button>
        </div>
      </div>

      {/* Password */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg p-5 mb-6">
        <h3 className="text-sm font-medium mb-2">Password Protection</h3>
        <p className="text-xs text-[var(--muted)] mb-4">
          {settings.has_password === "true"
            ? "Password is set. Enter a new one to change it."
            : "No password set. Set one to protect your data."}
        </p>
        <div className="flex gap-3 items-end">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
            className="flex-1 max-w-xs border border-[var(--border)] rounded-md px-3 py-2 text-sm"
          />
          <button
            onClick={setPasswordHandler}
            className="px-4 py-2 text-sm bg-[var(--accent)] text-white rounded-md hover:opacity-90"
          >
            Set Password
          </button>
        </div>
        {passwordMsg && <p className="text-xs mt-2 text-green-600">{passwordMsg}</p>}
      </div>

      {/* About */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg p-5">
        <h3 className="text-sm font-medium mb-2">About</h3>
        <p className="text-xs text-[var(--muted)]">
          ClearBooks — Personal Finance Tracker. Data stored locally in SQLite. Bank sync via Plaid.
        </p>
      </div>
    </div>
  );
}
