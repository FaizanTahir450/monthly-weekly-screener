"use client";

import type { ScanUniverse } from "@/components/scanTypes";

type ScanControlsProps = {
  universe: ScanUniverse;
  persist: boolean;
  alerts: boolean;
  isScanning: boolean;
  buttonLabel: string;
  scanningLabel?: string;
  onUniverseChange: (universe: ScanUniverse) => void;
  onPersistChange: (persist: boolean) => void;
  onAlertsChange: (alerts: boolean) => void;
  onRunScan: () => void;
};

const universes: { value: ScanUniverse; label: string }[] = [
  { value: "default", label: "Default 5" },
  { value: "top100", label: "Top 100 CG" },
  { value: "top200", label: "Top 200 CG" },
  { value: "top500", label: "Top 500 CG" },
  { value: "binance", label: "All Binance USDT" },
  { value: "multi", label: "Multi-Exchange USDT" },
  { value: "ai", label: "AI" },
  { value: "gaming", label: "Gaming" },
  { value: "rwa", label: "RWA" },
  { value: "meme", label: "Meme" },
  { value: "trending", label: "Trending" },
  { value: "recent", label: "Recently Listed" },
  { value: "events", label: "Events" },
  { value: "social", label: "Social Trends" },
];

export function ScanControls({
  universe,
  persist,
  alerts,
  isScanning,
  buttonLabel,
  scanningLabel = "Scanning...",
  onUniverseChange,
  onPersistChange,
  onAlertsChange,
  onRunScan,
}: ScanControlsProps) {
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(180px,220px)_1fr_auto] lg:items-center">
      <label className="grid gap-2 text-sm text-slate-300">
        <span className="text-xs uppercase text-slate-500">Universe</span>
        <select
          value={universe}
          onChange={(event) =>
            onUniverseChange(event.target.value as ScanUniverse)
          }
          disabled={isScanning}
          className="h-11 rounded-md border border-line bg-[#0b111a] px-3 text-sm text-white outline-none focus:border-emerald-400 disabled:cursor-not-allowed disabled:text-slate-500"
        >
          {universes.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-wrap gap-3">
        <label className="flex h-11 items-center gap-2 rounded-md border border-line bg-muted px-3 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={persist}
            onChange={(event) => onPersistChange(event.target.checked)}
            disabled={isScanning}
            className="size-4 accent-emerald-500"
          />
          Save to Supabase
        </label>
        <label className="flex h-11 items-center gap-2 rounded-md border border-line bg-muted px-3 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={alerts}
            onChange={(event) => onAlertsChange(event.target.checked)}
            disabled={isScanning}
            className="size-4 accent-emerald-500"
          />
          Send Telegram alerts
        </label>
      </div>

      <button
        type="button"
        onClick={onRunScan}
        disabled={isScanning}
        className="h-11 rounded-md bg-emerald-500 px-5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
      >
        {isScanning ? scanningLabel : buttonLabel}
      </button>
    </div>
  );
}
