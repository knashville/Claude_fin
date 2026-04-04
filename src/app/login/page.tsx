"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"loading" | "setup" | "login">("loading");
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/check")
      .then((r) => r.json())
      .then((data) => {
        if (data.status === "authenticated") {
          router.replace("/");
        } else if (data.status === "setup_required") {
          setMode("setup");
        } else {
          setMode("login");
        }
      });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const endpoint = mode === "setup" ? "/api/auth/setup" : "/api/auth/login";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Authentication failed");
        setLoading(false);
        return;
      }

      router.replace("/");
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  };

  if (mode === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <p className="text-[var(--muted)]">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <div className="w-full max-w-sm">
        <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-lg p-8">
          <div className="text-center mb-6">
            <h1 className="text-xl font-semibold">ClearBooks</h1>
            <p className="text-sm text-[var(--muted)] mt-1">
              {mode === "setup" ? "Set up your password" : "Enter your password"}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-xs font-medium mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "setup" ? "Choose a password (min 4 chars)" : "Enter password"}
                className="w-full border border-[var(--border)] rounded-md px-3 py-2.5 text-sm"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={loading || !password}
              className="w-full py-2.5 text-sm bg-[var(--accent)] text-white rounded-md hover:opacity-90 disabled:opacity-50 font-medium"
            >
              {loading ? "..." : mode === "setup" ? "Create Password" : "Log In"}
            </button>
          </form>

          {mode === "setup" && (
            <p className="text-xs text-[var(--muted)] text-center mt-4">
              This password protects your finance data. Store it somewhere safe.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
