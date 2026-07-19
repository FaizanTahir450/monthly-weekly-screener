"use client";

import { useMemo, useState } from "react";
import { ScanControls } from "@/components/ScanControls";
import { SignalTable, type TableCoin } from "@/components/SignalTable";
import { WatchlistTable } from "@/components/WatchlistTable";
import { useScanDefaults } from "@/components/useScanDefaults";
import {
  buildScanUrl,
  type ScanResponse,
  type ScanResult,
  type ScanUniverse,
} from "@/components/scanTypes";
import type { SignalStatus } from "@/lib/types";

export function ManualScanPanel() {
  const [scan, setScan] = useState<ScanResponse | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [universe, setUniverse] = useState<ScanUniverse>("default");
  const [persist, setPersist] = useState(false);
  const [alerts, setAlerts] = useState(false);

  useScanDefaults({ setUniverse, setPersist, setAlerts });

  const successfulCoins = useMemo(
    () =>
      scan?.results
        .filter((result): result is ScanResult & { data: TableCoin } =>
          Boolean(result.ok && result.data),
        )
        .map((result) => result.data) ?? [],
    [scan],
  );
  const failedCoins = scan?.results.filter((result) => !result.ok) ?? [];
  const signals = successfulCoins.filter((coin) => coin.status === "SIGNAL");
  const watchlist = successfulCoins.filter(
    (coin) => coin.status === "WATCHLIST",
  );
  const ignored = successfulCoins.filter((coin) => coin.status === "IGNORED");

  async function runScan() {
    setIsScanning(true);
    setError(null);

    try {
      const response = await fetch(buildScanUrl({ universe, persist, alerts }), {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`Manual scan failed with status ${response.status}`);
      }

      setScan((await response.json()) as ScanResponse);
    } catch (scanError) {
      setError(
        scanError instanceof Error
          ? scanError.message
          : "Manual scan failed.",
      );
    } finally {
      setIsScanning(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="panel p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Live Crypto Scan
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Runs the selected Binance USDT universe through the monthly RSI
              and weekly close-break strategy.
            </p>
          </div>
        </div>

        <div className="mt-5">
          <ScanControls
            universe={universe}
            persist={persist}
            alerts={alerts}
            isScanning={isScanning}
            buttonLabel="Run Live Scan"
            onUniverseChange={setUniverse}
            onPersistChange={setPersist}
            onAlertsChange={setAlerts}
            onRunScan={runScan}
          />
        </div>

        {error ? (
          <div className="mt-4 rounded-md border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {scan?.note ? (
          <div className="mt-4 rounded-md border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            {scan.note}
          </div>
        ) : null}

        {scan ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <ScanStat label="Scanned" value={scan.coinsScanned} />
            <ScanStat label="Signals" value={signals.length} tone="green" />
            <ScanStat label="Watchlist" value={watchlist.length} tone="amber" />
            <ScanStat label="Ignored" value={ignored.length} />
            <ScanStat label="Failed" value={failedCoins.length} tone="red" />
          </div>
        ) : null}

        {scan ? (
          <ScanMeta scan={scan} />
        ) : null}
      </div>

      {scan ? (
        <div className="space-y-6">
          <ResultSection
            title="Live Signals"
            emptyText="No confirmed live signals in this scan."
            coins={signals}
            status="SIGNAL"
          />
          <ResultSection
            title="Live Watchlist"
            emptyText="No live watchlist coins in this scan."
            coins={watchlist}
            status="WATCHLIST"
          />
          {failedCoins.length > 0 ? (
            <div className="panel p-5">
              <h3 className="text-base font-semibold text-white">
                Scan Errors
              </h3>
              <div className="mt-3 grid gap-2">
                {failedCoins.map((result) => (
                  <div
                    key={result.coin}
                    className="rounded-md border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-200"
                  >
                    {result.coin}: {result.error}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function ScanMeta({ scan }: { scan: ScanResponse }) {
  return (
    <div className="mt-4 grid gap-2 text-xs text-slate-500">
      <div>Last real scan completed {formatTime(scan.finishedAt)}</div>
      {scan.persistence ? (
        <div>
          Supabase:{" "}
          {scan.persistence.saved
            ? `saved ${scan.persistence.resultsSaved ?? 0} rows`
            : (scan.persistence.reason ?? "not saved")}
        </div>
      ) : null}
      {scan.alerts ? (
        <div>
          Telegram: sent {scan.alerts.sent}, skipped {scan.alerts.skipped}
          {scan.alerts.reason ? ` (${scan.alerts.reason})` : ""}
        </div>
      ) : null}
    </div>
  );
}

function ResultSection({
  title,
  emptyText,
  coins,
  status,
}: {
  title: string;
  emptyText: string;
  coins: TableCoin[];
  status: SignalStatus;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-base font-semibold text-white">{title}</h3>
      {coins.length === 0 ? (
        <div className="panel px-4 py-6 text-sm text-slate-400">
          {emptyText}
        </div>
      ) : status === "SIGNAL" ? (
        <SignalTable coins={coins} />
      ) : (
        <WatchlistTable coins={coins} />
      )}
    </div>
  );
}

function ScanStat({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: number;
  tone?: "green" | "amber" | "red" | "slate";
}) {
  const toneClass = {
    green: "text-emerald-300",
    amber: "text-amber-300",
    red: "text-red-300",
    slate: "text-white",
  }[tone];

  return (
    <div className="rounded-lg border border-line bg-muted p-4">
      <div className="text-xs uppercase text-slate-500">{label}</div>
      <div className={`mt-2 text-2xl font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
