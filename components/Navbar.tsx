"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/signals", label: "Live Signals" },
  { href: "/history", label: "Saved Results" },
  { href: "/watchlist", label: "Live Watchlist" },
  { href: "/scans", label: "Scan Logs" },
  { href: "/backtest", label: "Backtest" },
  { href: "/settings", label: "Settings" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="border-b border-line bg-[#0b111a]/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <Link href="/" className="group">
          <div className="text-lg font-semibold tracking-normal text-white">
            Crypto Value Screener
          </div>
          <div className="text-xs text-slate-400">
            Monthly RSI value signals with weekly close confirmation
          </div>
        </Link>
        <nav className="flex flex-wrap gap-2">
          {links.map((link) => {
            const active =
              pathname === link.href ||
              (link.href !== "/" && pathname.startsWith(link.href));

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-2 text-sm transition ${
                  active
                    ? "bg-emerald-500 text-slate-950"
                    : "border border-line bg-muted text-slate-300 hover:border-slate-500 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
