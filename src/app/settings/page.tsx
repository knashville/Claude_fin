"use client";

import { useState, useEffect } from "react";
import { formatCents } from "@/lib/utils";

interface Account {
  id: string;
  name: string;
  type: string;
  currentBalance: number;
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

  const fetchData = () => {
    fetch("/api/accounts").then((r) => r.json()).then(setAccounts);
    fetch("/api/settings").then((r) => r.json()).then(setSettings);
  };

  useEffect(() => { fetchData(); }, []);

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

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">Settings</h2>
        <p className="text-sm text-[var(--muted)]">Manage accounts and app settings</p>
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

      {/* Data Management */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg p-5">
        <h3 className="text-sm font-medium mb-2">About</h3>
        <p className="text-xs text-[var(--muted)]">
          ClearBooks — Personal Finance Tracker. All data stored locally in SQLite.
        </p>
      </div>
    </div>
  );
}
