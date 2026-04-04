"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/transactions", label: "Transactions", icon: "📋" },
  { href: "/import", label: "Import", icon: "📁" },
  { href: "/categories", label: "Categories", icon: "🏷️" },
  { href: "/rules", label: "Rules", icon: "⚙️" },
  { href: "/recurring", label: "Recurring", icon: "🔄" },
  { href: "/settings", label: "Settings", icon: "🔧" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <aside className="w-56 border-r border-[var(--border)] bg-[var(--sidebar-bg)] flex flex-col h-screen sticky top-0">
      <div className="p-5 border-b border-[var(--border)]">
        <h1 className="text-lg font-semibold tracking-tight">ClearBooks</h1>
        <p className="text-xs text-[var(--muted)] mt-0.5">Personal Finance</p>
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-[var(--accent)] text-white font-medium"
                  : "text-[var(--foreground)] hover:bg-zinc-100"
              )}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-[var(--border)]">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-[var(--muted)] hover:bg-zinc-100 w-full"
        >
          <span className="text-base">🚪</span>
          Log Out
        </button>
      </div>
    </aside>
  );
}
