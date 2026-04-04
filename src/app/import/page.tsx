"use client";

import { useState, useCallback, useEffect } from "react";

interface ParseResult {
  headers: string[];
  rowCount: number;
  sampleRows: Record<string, string>[];
  suggestedMapping: Partial<ColumnMapping>;
}

interface ColumnMapping {
  date: string;
  amount: string;
  merchant: string;
  description?: string;
}

interface ImportResult {
  imported: number;
  skipped: number;
  total: number;
}

interface Account {
  id: string;
  name: string;
  type: string;
}

type Step = "upload" | "mapping" | "result";

export default function ImportPage() {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({ date: "", amount: "", merchant: "" });
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then(setAccounts);
  }, []);

  const handleFileUpload = useCallback(async (uploadedFile: File) => {
    setFile(uploadedFile);
    setError("");
    setLoading(true);

    const formData = new FormData();
    formData.append("file", uploadedFile);

    try {
      const res = await fetch("/api/import/parse", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to parse CSV");
      }
      const data: ParseResult = await res.json();
      setParseResult(data);
      setMapping({
        date: data.suggestedMapping.date ?? "",
        amount: data.suggestedMapping.amount ?? "",
        merchant: data.suggestedMapping.merchant ?? "",
        description: data.suggestedMapping.description,
      });
      setStep("mapping");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to parse file");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleConfirm = async () => {
    if (!file || !mapping.date || !mapping.amount || !mapping.merchant || !selectedAccountId) return;

    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("mapping", JSON.stringify(mapping));
    formData.append("accountId", selectedAccountId);

    try {
      const res = await fetch("/api/import/confirm", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Import failed");
      }
      const data: ImportResult = await res.json();
      setImportResult(data);
      setStep("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep("upload");
    setFile(null);
    setParseResult(null);
    setImportResult(null);
    setMapping({ date: "", amount: "", merchant: "" });
    setError("");
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">Import Transactions</h2>
        <p className="text-sm text-[var(--muted)]">Upload a CSV file from your bank or credit card</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Step 1: Upload */}
      {step === "upload" && (
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg p-8">
          <label
            className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-300 rounded-lg p-12 cursor-pointer hover:border-[var(--accent)] transition-colors"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files[0];
              if (f) handleFileUpload(f);
            }}
          >
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileUpload(f);
              }}
            />
            <span className="text-3xl mb-2">📁</span>
            <span className="text-sm font-medium">
              {loading ? "Parsing..." : "Drop a CSV file here or click to browse"}
            </span>
            <span className="text-xs text-[var(--muted)] mt-1">
              Supports most bank and credit card CSV formats
            </span>
          </label>
        </div>
      )}

      {/* Step 2: Column Mapping */}
      {step === "mapping" && parseResult && (
        <div className="space-y-6">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg p-6">
            <h3 className="text-sm font-medium mb-4">Map Columns</h3>
            <p className="text-xs text-[var(--muted)] mb-4">
              Found {parseResult.rowCount} rows. Match your CSV columns to transaction fields.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-xs font-medium mb-1">
                  Account <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full border border-[var(--border)] rounded-md px-3 py-2 text-sm bg-white"
                >
                  <option value="">Select account...</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.type})
                    </option>
                  ))}
                </select>
              </div>
              {(["date", "amount", "merchant"] as const).map((field) => (
                <div key={field}>
                  <label className="block text-xs font-medium mb-1 capitalize">
                    {field} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={mapping[field]}
                    onChange={(e) => setMapping({ ...mapping, [field]: e.target.value })}
                    className="w-full border border-[var(--border)] rounded-md px-3 py-2 text-sm bg-white"
                  >
                    <option value="">Select column...</option>
                    {parseResult.headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium mb-1">Description (optional)</label>
                <select
                  value={mapping.description ?? ""}
                  onChange={(e) => setMapping({ ...mapping, description: e.target.value || undefined })}
                  className="w-full border border-[var(--border)] rounded-md px-3 py-2 text-sm bg-white"
                >
                  <option value="">None</option>
                  {parseResult.headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Preview */}
            <h4 className="text-xs font-medium text-[var(--muted)] mb-2">Preview (first 5 rows)</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    {parseResult.headers.map((h) => (
                      <th key={h} className="px-2 py-1.5 text-left font-medium text-[var(--muted)]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parseResult.sampleRows.map((row, i) => (
                    <tr key={i} className="border-b border-[var(--border)]">
                      {parseResult.headers.map((h) => (
                        <td key={h} className="px-2 py-1.5 whitespace-nowrap">
                          {row[h]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={reset} className="px-4 py-2 text-sm border border-[var(--border)] rounded-md hover:bg-zinc-50">
              Back
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading || !mapping.date || !mapping.amount || !mapping.merchant || !selectedAccountId}
              className="px-4 py-2 text-sm bg-[var(--accent)] text-white rounded-md hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Importing..." : `Import ${parseResult.rowCount} transactions`}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Result */}
      {step === "result" && importResult && (
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg p-8 text-center">
          <span className="text-4xl">✅</span>
          <h3 className="text-lg font-semibold mt-3">Import Complete</h3>
          <div className="mt-4 space-y-1 text-sm">
            <p><strong>{importResult.imported}</strong> transactions imported</p>
            {importResult.skipped > 0 && (
              <p className="text-[var(--muted)]">{importResult.skipped} duplicates skipped</p>
            )}
          </div>
          <div className="mt-6 flex gap-3 justify-center">
            <button onClick={reset} className="px-4 py-2 text-sm border border-[var(--border)] rounded-md hover:bg-zinc-50">
              Import Another
            </button>
            <a href="/transactions" className="px-4 py-2 text-sm bg-[var(--accent)] text-white rounded-md hover:opacity-90 inline-block">
              View Transactions
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
