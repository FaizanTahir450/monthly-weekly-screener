"use client";

import { useState } from "react";

type BacktestResponse = {
  mode: "supabase" | "sample";
  note?: string;
  sourceRows?: number;
  summary: {
    totalSignals: number;
    winRate4Week: number | null;
    winRate8Week: number | null;
    winRate12Week: number | null;
    averageReturn4Week: number | null;
    averageReturn8Week: number | null;
    averageReturn12Week: number | null;
    worstDrawdown: number | null;
  };
  results: {
    symbol: string;
    exchange?: string;
    signalDate: string;
    entryPrice: number;
    return4Week: number | null;
    return8Week: number | null;
    return12Week: number | null;
    maxDrawdown: number | null;
  }[];
};

export default function BacktestPage() {
  const [backtest, setBacktest] = useState<BacktestResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runBacktest() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/backtest", {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error(`Backtest failed with status ${response.status}`);
      }

      setBacktest((await response.json()) as BacktestResponse);
    } catch (backtestError) {
      setError(
        backtestError instanceof Error
          ? backtestError.message
          : "Backtest failed.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="section-title">Backtest</h1>
          <p className="section-copy">
            Review 4-week, 8-week, and 12-week returns from saved Supabase
            signals. Sample data is used only when no saved signals exist.
          </p>
        </div>
        <button
          type="button"
          onClick={runBacktest}
          disabled={isLoading}
          className="h-11 rounded-md bg-emerald-500 px-5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
        >
          {isLoading ? "Running..." : "Run Backtest"}
        </button>
      </section>

      {error ? (
        <div className="rounded-md border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {backtest ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Mode" value={backtest.mode} />
            <Metric
              label="Total signals"
              value={String(backtest.summary.totalSignals)}
            />
            <Metric
              label="4-week win rate"
              value={formatPercent(backtest.summary.winRate4Week)}
              tone="green"
            />
            <Metric
              label="Worst drawdown"
              value={formatPercent(backtest.summary.worstDrawdown)}
              tone="amber"
            />
          </section>

          {backtest.note ? (
            <div className="rounded-md border border-line bg-muted px-4 py-3 text-sm text-slate-300">
              {backtest.note}
            </div>
          ) : null}

          <section className="panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="bg-muted text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Symbol</th>
                    <th className="px-4 py-3 font-medium">Source</th>
                    <th className="px-4 py-3 font-medium">Signal date</th>
                    <th className="px-4 py-3 font-medium">Entry</th>
                    <th className="px-4 py-3 font-medium">4-week</th>
                    <th className="px-4 py-3 font-medium">8-week</th>
                    <th className="px-4 py-3 font-medium">12-week</th>
                    <th className="px-4 py-3 font-medium">Max drawdown</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {backtest.results.map((result) => (
                    <tr
                      key={`${result.symbol}-${result.signalDate}`}
                      className="hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-3 font-medium text-white">
                        {result.symbol}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {result.exchange ?? "BINANCE"}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {formatDate(result.signalDate)}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {result.entryPrice.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {formatPercent(result.return4Week)}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {formatPercent(result.return8Week)}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {formatPercent(result.return12Week)}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {formatPercent(result.maxDrawdown)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <div className="panel px-4 py-6 text-sm text-slate-400">
          Run a backtest to load saved signal performance.
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string;
  tone?: "green" | "amber" | "slate";
}) {
  const toneClass = {
    green: "text-emerald-300",
    amber: "text-amber-300",
    slate: "text-white",
  }[tone];

  return (
    <div className="panel p-5">
      <div className="text-sm text-slate-400">{label}</div>
      <div className={`mt-3 text-2xl font-semibold capitalize ${toneClass}`}>
        {value}
      </div>
    </div>
  );
}

function formatPercent(value: number | null) {
  return value === null ? "N/A" : `${value.toFixed(2)}%`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(new Date(value));
}
