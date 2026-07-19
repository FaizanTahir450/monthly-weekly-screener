import Link from "next/link";
import { notFound } from "next/navigation";
import { StarRating } from "@/components/StarRating";
import { StatusBadge } from "@/components/StatusBadge";
import {
  getExchangeMonthlyCandles,
  getExchangeWeeklyCandles,
  type ExchangeId,
} from "@/lib/exchanges";
import { averageVolume, findPreviousRedCandle, isGreenCandle, type Candle } from "@/lib/indicators";
import { defaultSettings } from "@/lib/settings";
import { evaluateCoin } from "@/lib/strategy";
import {
  loadLatestSignalResultForSymbol,
  loadSignalHistory,
} from "@/lib/supabase";
import type { StrategyCoinData } from "@/lib/strategy";

export const dynamic = "force-dynamic";

const knownCoins: Record<string, { name: string; marketCapRank: number }> = {
  BTCUSDT: { name: "Bitcoin", marketCapRank: 1 },
  ETHUSDT: { name: "Ethereum", marketCapRank: 2 },
  SOLUSDT: { name: "Solana", marketCapRank: 6 },
  BNBUSDT: { name: "BNB", marketCapRank: 5 },
  LINKUSDT: { name: "Chainlink", marketCapRank: 15 },
};

const serverRenderTime = Date.now();

type CoinDetailPageProps = {
  params: Promise<{
    symbol: string;
  }>;
};

export default async function CoinDetailPage({ params }: CoinDetailPageProps) {
  const { symbol: rawSymbol } = await params;
  const symbol = rawSymbol.toUpperCase();
  const coinMeta = knownCoins[symbol] ?? {
    name: symbol.replace("USDT", ""),
    marketCapRank: 999,
  };
  const savedSource = await loadLatestSignalResultForSymbolSafely(symbol);
  const exchange = normalizeExchange(savedSource.row?.exchange);
  const sourceSymbol = savedSource.row?.source_symbol ?? symbol;

  let weeklyCandles: Candle[];
  let monthlyCandles: Candle[];

  try {
    const [rawWeeklyCandles, rawMonthlyCandles] = await Promise.all([
      getExchangeWeeklyCandles({ exchange, sourceSymbol }),
      getExchangeMonthlyCandles({ exchange, sourceSymbol }),
    ]);
    weeklyCandles = onlyCompletedCandles(rawWeeklyCandles);
    monthlyCandles = onlyCompletedCandles(rawMonthlyCandles);
  } catch {
    notFound();
  }

  const lastWeeklyCandle = weeklyCandles.at(-1);
  const latestMonthlyCandle = monthlyCandles.at(-1);

  if (!lastWeeklyCandle || !latestMonthlyCandle) {
    notFound();
  }

  const coinData: StrategyCoinData = {
    name: coinMeta.name,
    symbol,
    price: lastWeeklyCandle.close,
    monthlyRsi: 0,
    weeklyOpen: lastWeeklyCandle.open,
    weeklyClose: lastWeeklyCandle.close,
    weeklyHigh: lastWeeklyCandle.high,
    previousRedWeeklyHigh: 0,
    weeklyVolume: lastWeeklyCandle.volume,
    averageWeeklyVolume20: 0,
    volume24h:
      lastWeeklyCandle.quoteVolume ??
      latestMonthlyCandle.quoteVolume ??
      latestMonthlyCandle.volume,
    marketCapRank: coinMeta.marketCapRank,
    isStablecoin: false,
    alreadyAlertedThisWeek: false,
    btcTrendOk: true,
    trending: false,
    weeklyCandles,
    monthlyCandles,
  };
  const evaluation = evaluateCoin(coinData, defaultSettings);
  const monthlyRsi = numberValue(evaluation.conditions.monthlyRsi.value);
  const previousRedCandle = findPreviousRedCandle(weeklyCandles);
  const previousRedWeeklyHigh = previousRedCandle?.high ?? null;
  const averageWeeklyVolume20 = averageVolume(weeklyCandles.slice(0, -1), 20);
  const weeklyGreen = isGreenCandle(lastWeeklyCandle);
  const closeBreakout =
    previousRedWeeklyHigh !== null &&
    lastWeeklyCandle.close > previousRedWeeklyHigh;
  const signalHistory = await loadSignalHistorySafely(symbol);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3">
            <Link
              href="/"
              className="text-sm text-emerald-300 hover:text-emerald-200"
            >
              Back to dashboard
            </Link>
          </div>
          <h1 className="section-title">
            {coinMeta.name} <span className="text-slate-500">{symbol}</span>
          </h1>
          <p className="section-copy">
            Real {exchange} candle detail using completed weekly and monthly
            candles from {sourceSymbol}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status={evaluation.status} />
          <StarRating stars={evaluation.stars} />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Monthly RSI" value={formatNumber(monthlyRsi, 1)} />
        <Metric
          label="Weekly candle"
          value={weeklyGreen ? "Green" : "Red"}
          tone={weeklyGreen ? "green" : "amber"}
        />
        <Metric
          label="Previous red high"
          value={formatNumber(previousRedWeeklyHigh, 2)}
        />
        <Metric
          label="Close breakout"
          value={closeBreakout ? "Confirmed" : "Not confirmed"}
          tone={closeBreakout ? "green" : "amber"}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Metric label="Source" value={`${exchange} ${sourceSymbol}`} />
        <Metric
          label="Current weekly close"
          value={formatNumber(lastWeeklyCandle.close, 2)}
        />
        <Metric
          label="20-week average volume"
          value={formatCompact(averageWeeklyVolume20)}
        />
        <Metric
          label="Last weekly volume"
          value={formatCompact(lastWeeklyCandle.volume)}
        />
      </section>

      <section className="panel p-5">
        <h2 className="text-lg font-semibold text-white">Strategy Reason</h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          {evaluation.reason}
        </p>
      </section>

      <SignalHistoryTable history={signalHistory} />

      <section className="grid gap-6 xl:grid-cols-2">
        <CandleTable
          title="Last 10 Weekly Candles"
          candles={weeklyCandles.slice(-10).reverse()}
        />
        <CandleTable
          title="Last 15 Monthly Candles"
          candles={monthlyCandles.slice(-15).reverse()}
        />
      </section>
    </div>
  );
}

type SignalHistory = Awaited<ReturnType<typeof loadSignalHistory>>;
type LatestSignalSource = Awaited<
  ReturnType<typeof loadLatestSignalResultForSymbol>
>;

async function loadSignalHistorySafely(symbol: string): Promise<SignalHistory> {
  try {
    return await loadSignalHistory(symbol);
  } catch (error) {
    return {
      source: "unavailable",
      rows: [],
      reason:
        error instanceof Error
          ? `Could not load Supabase signal history: ${error.message}`
          : "Could not load Supabase signal history.",
    };
  }
}

async function loadLatestSignalResultForSymbolSafely(
  symbol: string,
): Promise<LatestSignalSource> {
  try {
    return await loadLatestSignalResultForSymbol(symbol);
  } catch (error) {
    return {
      source: "unavailable",
      row: null,
      reason:
        error instanceof Error
          ? `Could not load latest saved source: ${error.message}`
          : "Could not load latest saved source.",
    };
  }
}

function normalizeExchange(exchange: string | null | undefined): ExchangeId {
  return exchange === "BYBIT" || exchange === "OKX" ? exchange : "BINANCE";
}

function SignalHistoryTable({ history }: { history: SignalHistory }) {
  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-line px-4 py-3">
        <h2 className="text-base font-semibold text-white">Signal History</h2>
      </div>
      {history.rows.length === 0 ? (
        <div className="px-4 py-6 text-sm text-slate-400">
          {history.reason ?? "No saved scan results for this symbol yet."}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-muted text-xs uppercase text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Stars</th>
                <th className="px-4 py-3 font-medium">Monthly RSI</th>
                <th className="px-4 py-3 font-medium">Weekly Close</th>
                <th className="px-4 py-3 font-medium">Prev Red High</th>
                <th className="px-4 py-3 font-medium">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {history.rows.map((row) => (
                <tr
                  key={`${row.created_at}-${row.status}`}
                  className="hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-3 text-slate-400">
                    {formatDateTime(row.created_at)}
                  </td>
                  <td className="px-4 py-3 text-slate-300">{row.status}</td>
                  <td className="px-4 py-3 text-slate-400">
                    <div>{row.exchange ?? "BINANCE"}</div>
                    <div className="text-xs text-slate-500">
                      {row.source_symbol ?? "N/A"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{row.stars}</td>
                  <td className="px-4 py-3 text-slate-300">
                    {formatNumber(row.monthly_rsi, 1)}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {formatNumber(row.weekly_close, 2)}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {formatNumber(row.previous_red_high, 2)}
                  </td>
                  <td className="max-w-md px-4 py-3 text-slate-400">
                    {row.reason}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
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
      <div className={`mt-3 text-2xl font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}

function CandleTable({ title, candles }: { title: string; candles: Candle[] }) {
  return (
    <div className="panel overflow-hidden">
      <div className="border-b border-line px-4 py-3">
        <h2 className="text-base font-semibold text-white">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left text-sm">
          <thead className="bg-muted text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Close Time</th>
              <th className="px-4 py-3 font-medium">Open</th>
              <th className="px-4 py-3 font-medium">High</th>
              <th className="px-4 py-3 font-medium">Low</th>
              <th className="px-4 py-3 font-medium">Close</th>
              <th className="px-4 py-3 font-medium">Volume</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {candles.map((candle) => (
              <tr key={candle.closeTime} className="hover:bg-white/[0.02]">
                <td className="px-4 py-3 text-slate-400">
                  {formatDate(candle.closeTime)}
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {formatNumber(candle.open, 2)}
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {formatNumber(candle.high, 2)}
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {formatNumber(candle.low ?? null, 2)}
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {formatNumber(candle.close, 2)}
                </td>
                <td className="px-4 py-3 text-slate-300">
                  {formatCompact(candle.volume)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function onlyCompletedCandles(candles: Candle[]) {
  return candles.filter(
    (candle) =>
      candle.closeTime === undefined || candle.closeTime <= serverRenderTime,
  );
}

function numberValue(value: unknown) {
  return typeof value === "number" ? value : null;
}

function formatNumber(value: number | null | undefined, digits: number) {
  return value === null || value === undefined
    ? "N/A"
    : value.toLocaleString(undefined, {
        maximumFractionDigits: digits,
        minimumFractionDigits: digits,
      });
}

function formatCompact(value: number | null | undefined) {
  return value === null || value === undefined
    ? "N/A"
    : Intl.NumberFormat(undefined, {
        notation: "compact",
        maximumFractionDigits: 2,
      }).format(value);
}

function formatDate(value: number | undefined) {
  if (value === undefined) {
    return "N/A";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
