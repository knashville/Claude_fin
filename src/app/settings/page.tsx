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
    TellerConnect?: {
      setup: (config: Record<string, unknown>) => { open: () => void };
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
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectMsg, setConnectMsg] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [tellerAppId, setTellerAppId] = useState("");
  const [tellerEnv, setTellerEnv] = useState("sandbox");

  const fetchData = () => {
    fetch("/api/accounts").then((r) => r.json()).then(setAccounts);
    fetch("/api/settings").then((r) => r.json()).then(setSettings);
  };

  useEffect(() => {
    fetchData();
    // Get Teller config
    fetch("/api/teller/config").then((r) => r.json()).then((data) => {
      setTellerAppId(data.appId);
      setTellerEnv(data.environment);
    });
  }, []);

  // Load Teller Connect script
  useEffect(() => {
    if (document.getElementById("teller-connect-script")) return;
    const script = document.createElement("script");
    script.id = "teller-connect-script";
    script.src = "https://cdn.teller.io/connect/connect.js";
    script.async = true;
    document.head.appendChild(script);
  }, []);

  const connectBank = useCallback(async () => {
    setConnectLoading(true);
    setConnectMsg("");

    if (!tellerAppId) {
      setConnectMsg("Teller app ID not configured. Add TELLER_APP_ID to .env");
      setConnectLoading(false);
      return;
    }

    if (!window.TellerConnect) {
      setConnectMsg("Teller Connect is still loading. Try again in a moment.");
      setConnectLoading(false);
      return;
    }

    try {
      const handler = window.TellerConnect.setup({
        applicationId: tellerAppId,
        environment: tellerEnv,
        onSuccess: async (enrollment: { accessToken: string; enrollment: { id: string; institution: { name: string } } }) => {
          setConnectMsg("Connected! Syncing accounts...");

          const enrollRes = await fetch("/api/teller/enroll", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              accessToken: enrollment.accessToken,
              enrollmentId: enrollment.enrollment.id,
            }),
          });
          const enrollData = await enrollRes.json();

          if (enrollRes.ok) {
            setConnectMsg(`Connected ${enrollData.accounts} account(s) from ${enrollment.enrollment.institution.name}. Syncing transactions...`);
            // Auto-sync
            const syncRes = await fetch("/api/teller/sync", { method: "POST" });
            const syncData = await syncRes.json();
            if (syncRes.ok) {
              setConnectMsg(`Connected ${enrollData.accounts} account(s). Imported ${syncData.imported} transactions.`);
            }
            fetchData();
          } else {
            setConnectMsg(enrollData.error || "Failed to connect");
          }
          setConnectLoading(false);
        },
        onExit: () => {
          setConnectLoading(false);
        },
        onFailure: (failure: { type: string; message: string }) => {
          setConnectMsg(`Connection failed: ${failure.message}`);
          setConnectLoading(false);
        },
      });

      handler.open();
    } catch {
      setConnectMsg("Failed to open bank connection");
      setConnectLoading(false);
    }
  }, [tellerAppId, tellerEnv]);

  const syncTransactions = async () => {
    setSyncing(true);
    setSyncMsg("");
    try {
      const res = await fetch("/api/teller/sync", { method: "POST" });
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
          Connect your bank accounts to automatically sync transactions via Teller.
        </p>

        <div className="flex gap-3">
          <button
            onClick={connectBank}
            disabled={connectLoading}
            className="px-4 py-2 text-sm bg-[var(--accent)] text-white rounded-md hover:opacity-90 disabled:opacity-50"
          >
            {connectLoading ? "Connecting..." : "Connect a Bank"}
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

        {connectMsg && (
          <p className="text-xs mt-3 text-green-600">{connectMsg}</p>
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
          ClearBooks — Personal Finance Tracker. Data stored locally in SQLite. Bank sync via Teller.
        </p>
      </div>
    </div>
  );
}
