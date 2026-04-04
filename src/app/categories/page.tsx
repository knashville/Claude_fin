"use client";

import { useState, useEffect } from "react";

interface Category {
  id: string;
  name: string;
  color: string;
  isIncome: boolean;
  _count: { transactions: number };
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#6B7280");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  const fetchCategories = () => {
    fetch("/api/categories").then((r) => r.json()).then(setCategories);
  };

  useEffect(() => { fetchCategories(); }, []);

  const addCategory = async () => {
    if (!newName.trim()) return;
    await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), color: newColor }),
    });
    setNewName("");
    setNewColor("#6B7280");
    fetchCategories();
  };

  const updateCategory = async (id: string) => {
    await fetch(`/api/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, color: editColor }),
    });
    setEditingId(null);
    fetchCategories();
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Delete this category? Transactions will become uncategorized.")) return;
    await fetch(`/api/categories/${id}`, { method: "DELETE" });
    fetchCategories();
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">Categories</h2>
        <p className="text-sm text-[var(--muted)]">Manage spending categories</p>
      </div>

      {/* Add new category */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg p-4 mb-6">
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium mb-1">Name</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Category name"
              className="w-full border border-[var(--border)] rounded-md px-3 py-2 text-sm"
              onKeyDown={(e) => e.key === "Enter" && addCategory()}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Color</label>
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="w-10 h-9 border border-[var(--border)] rounded-md cursor-pointer"
            />
          </div>
          <button
            onClick={addCategory}
            className="px-4 py-2 text-sm bg-[var(--accent)] text-white rounded-md hover:opacity-90"
          >
            Add
          </button>
        </div>
      </div>

      {/* Categories list */}
      <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg overflow-hidden">
        {categories.map((cat) => (
          <div key={cat.id} className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] last:border-0">
            {editingId === cat.id ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="color"
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  className="w-8 h-8 border border-[var(--border)] rounded cursor-pointer"
                />
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="border border-[var(--border)] rounded-md px-2 py-1 text-sm flex-1"
                  onKeyDown={(e) => e.key === "Enter" && updateCategory(cat.id)}
                />
                <button onClick={() => updateCategory(cat.id)} className="text-xs text-[var(--accent)]">Save</button>
                <button onClick={() => setEditingId(null)} className="text-xs text-[var(--muted)]">Cancel</button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="text-sm font-medium">{cat.name}</span>
                  {cat.isIncome && <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">income</span>}
                  <span className="text-xs text-[var(--muted)]">{cat._count.transactions} txns</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setEditingId(cat.id); setEditName(cat.name); setEditColor(cat.color); }}
                    className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteCategory(cat.id)}
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
