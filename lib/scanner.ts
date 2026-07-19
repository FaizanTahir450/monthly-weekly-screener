import {
  getBinanceUsdtSpotMarkets,
  getBinanceUsdtSpotSymbols,
  getWeeklyCandles,
} from "./binance.ts";
import {
  type CoinCategoryUniverse,
  getTopBinanceUsdtUniverse,
  getTrendingBinanceUsdtCoins,
  getTrendingSymbols,
  type CoinUniverseLimit,
} from "./coingecko.ts";
import {
  type ExchangeId,
  getExchangeMonthlyCandles,
  getExchangeWeeklyCandles,
  getMultiExchangeUsdtSpotMarkets,
} from "./exchanges.ts";
import type { Candle } from "./indicators.ts";
import { defaultSettings } from "./settings.ts";
import { evaluateCoin } from "./strategy.ts";
import { hasAlertedThisWeek, saveScanResponse } from "./supabase.ts";
import { sendTelegramSignalAlerts } from "./telegram.ts";
import type { StrategyCoinData } from "./strategy.ts";
import type { SignalStatus, StrategySettings } from "./types.ts";

export type ScanCoin = {
  name: string;
  symbol: string;
  sourceSymbol?: string;
  exchange?: ExchangeId;
  marketCapRank: number;
  volume24h?: number;
  coingeckoId?: string;
  isStablecoin?: boolean;
  trending?: boolean;
};

export type ScanResult = {
  coin: string;
  exchange?: ExchangeId;
  sourceSymbol?: string;
  ok: boolean;
  data?: {
    name: string;
    symbol: string;
    exchange: ExchangeId;
    sourceSymbol: string;
    price: number;
    monthlyRsi: number | null;
    weeklyOpen: number;
    weeklyClose: number;
    weeklyHigh: number;
    weeklyLow?: number;
    weeklyVolume: number;
    volume24h: number;
    marketCapRank: number;
    previousRedWeeklyHigh: number | null;
    status: SignalStatus;
    stars: number;
    reason: string;
    checks: ReturnType<typeof evaluateCoin>["checks"];
    conditions: ReturnType<typeof evaluateCoin>["conditions"];
  };
  error?: string;
};

export type ScanResponse = {
  scanType: "MANUAL_SCAN";
  startedAt: string;
  finishedAt: string;
  coinsScanned: number;
  universe:
    | "DEFAULT"
    | "TOP_100"
    | "TOP_200"
    | "TOP_500"
    | "BINANCE_USDT"
    | "MULTI_EXCHANGE_USDT"
    | "MULTI_EXCHANGE_ALL_MARKETS"
    | "AI"
    | "GAMING"
    | "RWA"
    | "MEME"
    | "TRENDING"
    | "RECENTLY_LISTED"
    | "EVENTS"
    | "SOCIAL";
  persistence?: Awaited<ReturnType<typeof saveScanResponse>>;
  alerts?: Awaited<ReturnType<typeof sendTelegramSignalAlerts>>;
  note?: string;
  results: ScanResult[];
};

export const defaultScanCoins: ScanCoin[] = [
  { name: "Bitcoin", symbol: "BTCUSDT", marketCapRank: 1 },
  { name: "Ethereum", symbol: "ETHUSDT", marketCapRank: 2 },
  { name: "Solana", symbol: "SOLUSDT", marketCapRank: 6 },
  { name: "BNB", symbol: "BNBUSDT", marketCapRank: 5 },
  { name: "Chainlink", symbol: "LINKUSDT", marketCapRank: 15 },
];

const DEFAULT_SCAN_CONCURRENCY = 16;

export async function runManualScan({
  coins = defaultScanCoins,
  settings = defaultSettings,
  universe = "DEFAULT",
  persist = false,
  alerts = false,
  concurrency,
}: {
  coins?: ScanCoin[];
  settings?: StrategySettings;
  universe?: ScanResponse["universe"];
  persist?: boolean;
  alerts?: boolean;
  concurrency?: number;
} = {}): Promise<ScanResponse> {
  const startedAt = new Date().toISOString();
  const now = Date.now();
  const btcTrendOk = settings.btcTrendFilter
    ? await calculateBtcTrendOk(now)
    : true;
  const trendingSymbols = settings.trendingCoinBoost
    ? await getTrendingSymbols()
    : new Set<string>();
  const results = await scanCoinsInBatches(
    coins,
    settings,
    now,
    btcTrendOk,
    trendingSymbols,
    concurrency,
  );
  const finishedAt = new Date().toISOString();

  const scan: ScanResponse = {
    scanType: "MANUAL_SCAN",
    startedAt,
    finishedAt,
    coinsScanned: coins.length,
    universe,
    results,
  };

  if (persist) {
    scan.persistence = await saveScanResponse(scan);
  }

  if (alerts) {
    scan.alerts = await sendTelegramSignalAlerts(scan, settings);
  }

  return scan;
}

async function scanCoinsInBatches(
  coins: ScanCoin[],
  settings: StrategySettings,
  now: number,
  btcTrendOk: boolean,
  trendingSymbols: Set<string>,
  concurrencyOverride?: number,
) {
  const concurrency = getScanConcurrency(concurrencyOverride);
  const results: ScanResult[] = [];

  for (let index = 0; index < coins.length; index += concurrency) {
    const batch = coins.slice(index, index + concurrency);
    const batchResults = await Promise.all(
      batch.map((coin) =>
        scanCoin(
          {
            ...coin,
            trending: coin.trending ?? trendingSymbols.has(coin.symbol),
          },
          settings,
          now,
          btcTrendOk,
        ),
      ),
    );
    results.push(...batchResults);
    logScanProgress({
      scanned: Math.min(index + batch.length, coins.length),
      total: coins.length,
      succeeded: results.filter((result) => result.ok).length,
      failed: results.filter((result) => !result.ok).length,
    });
  }

  return results;
}

function logScanProgress({
  scanned,
  total,
  succeeded,
  failed,
}: {
  scanned: number;
  total: number;
  succeeded: number;
  failed: number;
}) {
  if (process.env.SCAN_PROGRESS_LOGS !== "true") {
    return;
  }

  console.error(
    `[scan] ${scanned}/${total} scanned, ${succeeded} ok, ${failed} failed`,
  );
}

function getScanConcurrency(override?: number) {
  if (override && Number.isFinite(override) && override >= 1) {
    return Math.min(Math.floor(override), 50);
  }

  const configured = Number(process.env.SCAN_CONCURRENCY);

  if (Number.isFinite(configured) && configured >= 1) {
    return Math.min(Math.floor(configured), 50);
  }

  return DEFAULT_SCAN_CONCURRENCY;
}

function getMultiExchangeScanConcurrency() {
  const configured = Number(process.env.MULTI_EXCHANGE_SCAN_CONCURRENCY);

  if (Number.isFinite(configured) && configured >= 1) {
    return Math.min(Math.floor(configured), 10);
  }

  return 2;
}

function allowPartialMultiExchangeScan() {
  return process.env.MULTI_EXCHANGE_ALLOW_PARTIAL === "true";
}

export async function runTopCoinScan({
  limit,
  settings = defaultSettings,
  persist = false,
  alerts = false,
}: {
  limit: CoinUniverseLimit;
  settings?: StrategySettings;
  persist?: boolean;
  alerts?: boolean;
}) {
  const universe = await getTopBinanceUsdtUniverse(limit);
  const scan = await runManualScan({
    coins: universe.coins,
    settings,
    universe: `TOP_${limit}` as ScanResponse["universe"],
    persist,
    alerts,
  });
  scan.note = `Top ${limit} CoinGecko scan loaded ${universe.candidates} candidates and found ${universe.coins.length} Binance USDT spot matches after stablecoin filtering.`;

  return scan;
}

export async function runAllBinanceUsdtScan({
  settings = defaultSettings,
  persist = false,
  alerts = false,
}: {
  settings?: StrategySettings;
  persist?: boolean;
  alerts?: boolean;
} = {}) {
  const markets = await getBinanceUsdtSpotMarkets();
  const coins = markets.map((market) => ({
    name: market.baseAsset,
    symbol: market.symbol,
    marketCapRank: 9999,
    isStablecoin: isStablecoinSymbol(market.symbol),
  }));
  const scanSettings = {
    ...settings,
    topMarketCapFilter: false,
  };
  const scan = await runManualScan({
    coins,
    settings: scanSettings,
    universe: "BINANCE_USDT",
    persist,
    alerts,
  });
  scan.note = `All Binance USDT scan loaded ${markets.length} live spot markets. Market-cap filtering is disabled for this universe because Binance does not provide market-cap ranks.`;

  return scan;
}

export async function runMultiExchangeUsdtScan({
  settings = defaultSettings,
  persist = false,
  alerts = false,
  allMarkets = false,
}: {
  settings?: StrategySettings;
  persist?: boolean;
  alerts?: boolean;
  allMarkets?: boolean;
} = {}) {
  const allowPartial = allowPartialMultiExchangeScan();
  const universe = await getMultiExchangeUsdtSpotMarkets({
    allowPartial,
    dedupe: !allMarkets,
  });
  const coins = universe.markets.map((market) => ({
    name: market.baseAsset,
    symbol: market.symbol,
    sourceSymbol: market.sourceSymbol,
    exchange: market.exchange,
    marketCapRank: 9999,
    isStablecoin: isStablecoinSymbol(market.symbol),
  }));
  const scanSettings = {
    ...settings,
    topMarketCapFilter: false,
  };
  logUniverseProgress(
    `Loaded ${universe.counts.selected} selected markets from ${universe.counts.unique} unique symbols.`,
  );
  const scan = await runManualScan({
    coins,
    settings: scanSettings,
    universe: allMarkets ? "MULTI_EXCHANGE_ALL_MARKETS" : "MULTI_EXCHANGE_USDT",
    persist,
    alerts,
    concurrency: getMultiExchangeScanConcurrency(),
  });
  const unavailableNote =
    universe.unavailable.length > 0
      ? ` Skipped unavailable sources: ${universe.unavailable
          .map((source) => `${source.name} (${source.error})`)
          .join("; ")}.`
      : "";
  const coverageNote = allowPartial
    ? " Partial source mode is enabled."
    : " All exchange sources are required before scanning.";
  const modeNote = allMarkets
    ? ` Selected ${universe.counts.selected} exchange markets for full per-exchange coverage.`
    : " Duplicate symbols prefer Binance, then Bybit, OKX, KuCoin, Gate.io, MEXC, and Bitget.";
  scan.note = `Multi-exchange scan loaded ${universe.counts.unique} unique USDT spot symbols across Binance (${universe.counts.binance}), Bybit (${universe.counts.bybit}), OKX (${universe.counts.okx}), KuCoin (${universe.counts.kucoin}), Gate.io (${universe.counts.gate}), MEXC (${universe.counts.mexc}), and Bitget (${universe.counts.bitget}).${modeNote} Market-cap filtering is disabled for this universe.${coverageNote}${unavailableNote}`;
  logUniverseProgress(scan.note);

  return scan;
}

function logUniverseProgress(message: string) {
  if (process.env.SCAN_PROGRESS_LOGS !== "true") {
    return;
  }

  console.error(`[scan] ${message}`);
}

export async function runCategoryScan({
  category,
  limit = 100,
  settings = defaultSettings,
  persist = false,
  alerts = false,
}: {
  category: CoinCategoryUniverse;
  limit?: CoinUniverseLimit;
  settings?: StrategySettings;
  persist?: boolean;
  alerts?: boolean;
}) {
  const universe = await getTopBinanceUsdtUniverse(limit, category);
  const scan = await runManualScan({
    coins: universe.coins,
    settings,
    universe: category.toUpperCase() as ScanResponse["universe"],
    persist,
    alerts,
  });
  scan.note = `${category.toUpperCase()} CoinGecko scan loaded ${universe.candidates} candidates and found ${universe.coins.length} Binance USDT spot matches after stablecoin filtering.`;

  return scan;
}

export async function runTrendingScan({
  settings = defaultSettings,
  persist = false,
  alerts = false,
}: {
  settings?: StrategySettings;
  persist?: boolean;
  alerts?: boolean;
} = {}) {
  const coins = await getTrendingBinanceUsdtCoins();
  return runManualScan({
    coins,
    settings,
    universe: "TRENDING",
    persist,
    alerts,
  });
}

export async function runConfiguredFeedScan({
  feed,
  settings = defaultSettings,
  persist = false,
  alerts = false,
}: {
  feed: "recentlyListed" | "events" | "social";
  settings?: StrategySettings;
  persist?: boolean;
  alerts?: boolean;
}) {
  const coins = await getConfiguredFeedCoins(feed);
  const universe = {
    recentlyListed: "RECENTLY_LISTED",
    events: "EVENTS",
    social: "SOCIAL",
  }[feed] as ScanResponse["universe"];

  const scan = await runManualScan({
    coins,
    settings,
    universe,
    persist,
    alerts,
  });
  const envKey = {
    recentlyListed: "RECENTLY_LISTED_SYMBOLS",
    events: "EVENT_COIN_SYMBOLS",
    social: "SOCIAL_TREND_SYMBOLS",
  }[feed];

  if (coins.length === 0) {
    scan.note = `No Binance USDT symbols found for ${envKey}. Add symbols like SOL, SOLUSDT, or SOLUSDT:Solana:6.`;
  }

  return scan;
}

async function scanCoin(
  coin: ScanCoin,
  settings: StrategySettings,
  now: number,
  btcTrendOk: boolean,
): Promise<ScanResult> {
  try {
    const exchange = coin.exchange ?? "BINANCE";
    const sourceSymbol = coin.sourceSymbol ?? coin.symbol;
    const [rawWeeklyCandles, rawMonthlyCandles] = await Promise.all([
      getExchangeWeeklyCandles({ exchange: coin.exchange, sourceSymbol }),
      getExchangeMonthlyCandles({ exchange: coin.exchange, sourceSymbol }),
    ]);
    const weeklyCandles = onlyCompletedCandles(rawWeeklyCandles, now);
    const monthlyCandles = onlyCompletedCandles(rawMonthlyCandles, now);
    const lastWeeklyCandle = weeklyCandles.at(-1);
    const latestMonthlyCandle = monthlyCandles.at(-1);

    if (!lastWeeklyCandle || !latestMonthlyCandle) {
      throw new Error(`${exchange} returned incomplete candle history.`);
    }

    const coinData: StrategyCoinData = {
      name: coin.name,
      symbol: coin.symbol,
      price: lastWeeklyCandle.close,
      monthlyRsi: 0,
      weeklyOpen: lastWeeklyCandle.open,
      weeklyClose: lastWeeklyCandle.close,
      weeklyHigh: lastWeeklyCandle.high,
      previousRedWeeklyHigh: 0,
      weeklyVolume: lastWeeklyCandle.volume,
      averageWeeklyVolume20: 0,
      volume24h:
        coin.volume24h ??
        lastWeeklyCandle.quoteVolume ??
        latestMonthlyCandle.quoteVolume ??
        latestMonthlyCandle.volume,
      marketCapRank: coin.marketCapRank,
      isStablecoin: coin.isStablecoin ?? false,
      alreadyAlertedThisWeek: await hasAlertedThisWeek(coin.symbol),
      btcTrendOk,
      trending: coin.trending ?? false,
      weeklyCandles,
      monthlyCandles,
    };
    const evaluation = evaluateCoin(coinData, settings);
    const monthlyRsi =
      typeof evaluation.conditions.monthlyRsi.value === "number"
        ? evaluation.conditions.monthlyRsi.value
        : null;
    const previousRedWeeklyHigh =
      typeof evaluation.conditions.weeklyCloseBreakout.value === "number"
        ? evaluation.conditions.weeklyCloseBreakout.value
        : null;

    return {
      coin: coin.symbol,
      exchange,
      sourceSymbol,
      ok: true,
      data: {
        name: coin.name,
        symbol: coin.symbol,
        exchange,
        sourceSymbol,
        price: lastWeeklyCandle.close,
        monthlyRsi,
        weeklyOpen: lastWeeklyCandle.open,
        weeklyClose: lastWeeklyCandle.close,
        weeklyHigh: lastWeeklyCandle.high,
        weeklyLow: lastWeeklyCandle.low,
        weeklyVolume: lastWeeklyCandle.volume,
        volume24h: coinData.volume24h,
        marketCapRank: coin.marketCapRank,
        previousRedWeeklyHigh,
        status: evaluation.status,
        stars: evaluation.stars,
        reason: evaluation.reason,
        checks: evaluation.checks,
        conditions: evaluation.conditions,
      },
    };
  } catch (error) {
    return {
      coin: coin.symbol,
      exchange: coin.exchange ?? "BINANCE",
      sourceSymbol: coin.sourceSymbol ?? coin.symbol,
      ok: false,
      error: error instanceof Error ? error.message : "Unknown scan error",
    };
  }
}

function onlyCompletedCandles(candles: Candle[], now: number) {
  return candles.filter(
    (candle) => candle.closeTime === undefined || candle.closeTime <= now,
  );
}

async function calculateBtcTrendOk(now: number) {
  const weeklyCandles = onlyCompletedCandles(
    await getWeeklyCandles("BTCUSDT"),
    now,
  );
  const lastWeeklyCandle = weeklyCandles.at(-1);
  const priorCandles = weeklyCandles.slice(-21, -1);

  if (!lastWeeklyCandle || priorCandles.length < 20) {
    return true;
  }

  const averageClose =
    priorCandles.reduce((sum, candle) => sum + candle.close, 0) /
    priorCandles.length;

  return lastWeeklyCandle.close > averageClose;
}

async function getConfiguredFeedCoins(
  feed: "recentlyListed" | "events" | "social",
) {
  const envKey = {
    recentlyListed: "RECENTLY_LISTED_SYMBOLS",
    events: "EVENT_COIN_SYMBOLS",
    social: "SOCIAL_TREND_SYMBOLS",
  }[feed];
  const configuredCoins = parseConfiguredSymbols(process.env[envKey]);

  if (configuredCoins.length === 0) {
    return [];
  }

  const binanceSymbols = await getBinanceUsdtSpotSymbols();
  return configuredCoins.filter((coin) => binanceSymbols.has(coin.symbol));
}

function parseConfiguredSymbols(value: string | undefined): ScanCoin[] {
  if (!value) {
    return [];
  }

  const coins = value
    .split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [rawSymbol, rawName, rawRank] = entry
        .split(":")
        .map((part) => part.trim());
      const symbol = normalizeUsdtSymbol(rawSymbol);

      return {
        name: rawName || symbol.replace(/USDT$/, ""),
        symbol,
        marketCapRank: Number(rawRank) || 9999,
        isStablecoin: isStablecoinSymbol(symbol),
        trending: true,
      };
    });

  return Array.from(
    new Map(coins.map((coin) => [coin.symbol, coin])).values(),
  );
}

function normalizeUsdtSymbol(symbol: string) {
  const normalized = symbol.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return normalized.endsWith("USDT") ? normalized : `${normalized}USDT`;
}

function isStablecoinSymbol(symbol: string) {
  const baseSymbol = symbol.replace(/USDT$/, "").toLowerCase();
  return new Set([
    "usdt",
    "usdc",
    "dai",
    "fdusd",
    "tusd",
    "usde",
    "usdd",
    "pyusd",
    "usdp",
    "gusd",
  ]).has(baseSymbol);
}
