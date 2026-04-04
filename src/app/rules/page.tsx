"use client";

import { useState, useEffect } from "react";

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Rule {
  id: string;
  pattern: string;
  field: string;
  matchType: string;
  categoryId: string;
  category: Category;
  priority: number;
}

export default function RulesPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newPattern, setNewPattern] = useState("");
  const [newMatchType, setNewMatchType] = useState("contains");
  const [newField, setNewField] = useState("merchant");
  const [newCategoryId, setNewCategoryId] = useState("");
  const [rerunResult, setRerunResult] = useState<string | null>(null);

  const fetchRules = () => {
    fetch("/api/rules").then((r) => r.json()).then(setRules);
  };

  useEffect(() => {
    fetchRules();
    fetch("/api/categories").then((r) => r.json()).then(setCategories);
  }, []);

  const addRule = async () => {
    if (!newPattern.trim() || !newCategoryId) return;
    await fetch("/api/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pattern: newPattern.trim(),
        matchType: newMatchType,
        field: newField,
        categoryId: newCategoryId,
      }),
    });
    setNewPattern("");
    fetchRules();
  };

  const deleteRule = async (id: string) => {
    await fetch(`/api/rules/${id}`, { method: "DELETE" });
    fetchRules();
  };

  const rerunRules = async () => {
    setRerunResult(null);
    const res = await fetch("/api/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "rerun" }),
    });
    const data = await res.json();
    setRerunResult(`Updated ${data.updated} transactions`);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold">Categorization Rules</h2>
          <p className="text-sm text-[var(--muted)]">Auto-categorize transactions by pattern matching</p>
        </div>
        <button
          onClick={rerunRules}
          className="px-4 py-2 text-sm border border-[var(--border)] rounded-md hover:bg-zinc-50"
        >
          Re-run All Rules
        </button>
      </div>

      {rerunResult && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          {rerunResult}
        </div>
      )}

      {/* Add rule */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg p-4 mb-6">
        <h3 className="text-sm font-medium mb-3">New Rule</h3>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium mb-1">Pattern</label>
            <input
              value={newPattern}
              onChange={(e) => setNewPattern(e.target.value)}
              placeholder='e.g. "SPOTIFY" or "TRADER JOE"'
              className="w-full border border-[var(--border)] rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Match Type</label>
            <select
              value={newMatchType}
              onChange={(e) => setNewMatchType(e.target.value)}
              className="border border-[var(--border)] rounded-md px-3 py-2 text-sm bg-white"
            >
              <option value="contains">Contains</option>
              <option value="startsWith">Starts With</option>
              <option value="exact">Exact</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Field</label>
            <select
              value={newField}
              onChange={(e) => setNewField(e.target.value)}
              className="border border-[var(--border)] rounded-md px-3 py-2 text-sm bg-white"
            >
              <option value="merchant">Merchant (cleaned)</option>
              <option value="rawMerchant">Raw Merchant</option>
            </select>
          </div>
          <div className="min-w-[160px]">
            <label className="block text-xs font-medium mb-1">Category</label>
            <select
              value={newCategoryId}
              onChange={(e) => setNewCategoryId(e.target.value)}
              className="w-full border border-[var(--border)] rounded-md px-3 py-2 text-sm bg-white"
            >
              <option value="">Select...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <button
            onClick={addRule}
            disabled={!newPattern.trim() || !newCategoryId}
            className="px-4 py-2 text-sm bg-[var(--accent)] text-white rounded-md hover:opacity-90 disabled:opacity-50"
          >
            Add Rule
          </button>
        </div>
      </div>

      {/* Rules list */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-zinc-50">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--muted)]">Pattern</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--muted)]">Match</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--muted)]">Field</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--muted)]">Category</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-[var(--muted)]"></th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule.id} className="border-b border-[var(--border)] last:border-0">
                <td className="px-4 py-2.5 font-mono text-xs">{rule.pattern}</td>
                <td className="px-4 py-2.5 text-xs text-[var(--muted)]">{rule.matchType}</td>
                <td className="px-4 py-2.5 text-xs text-[var(--muted)]">{rule.field}</td>
                <td className="px-4 py-2.5">
                  <span
                    className="text-xs px-1.5 py-0.5 rounded"
                    style={{
                      backgroundColor: rule.category.color + "20",
                      color: rule.category.color,
                    }}
                  >
                    {rule.category.name}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button
                    onClick={() => deleteRule(rule.id)}
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {rules.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[var(--muted)]">
                  No rules yet. Add one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
