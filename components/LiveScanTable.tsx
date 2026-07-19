"use client";

import { useMemo, useState } from "react";
import { ScanControls } from "@/components/ScanControls";
import { SignalTable, type TableCoin } from "@/components/SignalTable";
import { WatchlistTable } from "@/components/WatchlistTable";
import { useScanDefaults } from "@/components/useScanDefaults";
import {
  buildScanUrl,
  type ScanResponse,
  type ScanUniverse,
} from "@/components/scanTypes";
import type { SignalStatus } from "@/lib/types";

type LiveScanTableProps = {
  status: Extract<SignalStatus, "SIGNAL" | "WATCHLIST">;
  title: string;
  description: string;
  emptyText: string;
};

export function LiveScanTable({
  status,
  title,
  description,
  emptyText,
}: LiveScanTableProps) {
  const [scan, setScan] = useState<ScanResponse | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [universe, setUniverse] = useState<ScanUniverse>("default");
  const [persist, setPersist] = useState(false);
  const [alerts, setAlerts] = useState(false);

  useScanDefaults({ setUniverse, setPersist, setAlerts });

  const coins = useMemo(
    () =>
      scan?.results
        .filter((result): result is { coin: string; ok: true; data: TableCoin } =>
          Boolean(result.ok && result.data),
        )
        .map((result) => result.data)
        .filter((coin) => coin.status === status) ?? [],
    [scan, status],
  );

  async function runScan() {
    setIsScanning(true);
    setError(null);

    try {
      const response = await fetch(buildScanUrl({ universe, persist, alerts }), {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`Live scan failed with status ${response.status}`);
      }

      setScan((await response.json()) as ScanResponse);
    } catch (scanError) {
      setError(
        scanError instanceof Error ? scanError.message : "Live scan failed.",
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
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <p className="mt-1 text-sm text-slate-400">{description}</p>
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
          <div className="mt-4 grid gap-2 text-xs text-slate-500">
            <div>
              Showing {coins.length} matching coins from {scan.coinsScanned} scanned
              Binance symbols.
            </div>
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
        ) : null}
      </div>

      {scan ? (
        coins.length === 0 ? (
          <div className="panel px-4 py-6 text-sm text-slate-400">
            {emptyText}
          </div>
        ) : status === "SIGNAL" ? (
          <SignalTable coins={coins} />
        ) : (
          <WatchlistTable coins={coins} />
        )
      ) : (
        <div className="panel px-4 py-6 text-sm text-slate-400">
          Run a live scan to load current Binance results.
        </div>
      )}
    </section>
  );
}
