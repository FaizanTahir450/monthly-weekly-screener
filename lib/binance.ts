import type { Candle } from "./indicators.ts";

const DEFAULT_BINANCE_SPOT_BASE_URLS = [
  "https://data-api.binance.vision",
  "https://api.binance.com",
  "https://api-gcp.binance.com",
  "https://api1.binance.com",
  "https://api2.binance.com",
  "https://api3.binance.com",
  "https://api4.binance.com",
];

export type BinanceInterval = "1w" | "1M";

type BinanceKline = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
  number,
  string,
  string,
  string,
];

type BinanceExchangeInfo = {
  symbols: {
    symbol: string;
    status: string;
    baseAsset: string;
    quoteAsset: string;
    isSpotTradingAllowed?: boolean;
  }[];
};

export type BinanceUsdtSpotMarket = {
  symbol: string;
  baseAsset: string;
};

export async function getKlines(
  symbol: string,
  interval: BinanceInterval,
  limit: number,
): Promise<Candle[]> {
  const params = new URLSearchParams({
    symbol: symbol.toUpperCase(),
    interval,
    limit: String(limit),
  });
  const response = await fetchBinanceMarketData(
    `/api/v3/klines?${params.toString()}`,
    { next: { revalidate: 60 } },
  );

  if (!response.ok) {
    throw new Error(
      `Binance kline request failed for ${symbol}: ${response.status} ${response.statusText}`,
    );
  }

  const klines = (await response.json()) as BinanceKline[];
  return klines.map(normalizeKline);
}

export function getWeeklyCandles(symbol: string): Promise<Candle[]> {
  return getKlines(symbol, "1w", 80);
}

export function getMonthlyCandles(symbol: string): Promise<Candle[]> {
  return getKlines(symbol, "1M", 30);
}

export async function getBinanceUsdtSpotSymbols(): Promise<Set<string>> {
  const markets = await getBinanceUsdtSpotMarkets();
  return new Set(markets.map((market) => market.symbol));
}

export async function getBinanceUsdtSpotMarkets(): Promise<
  BinanceUsdtSpotMarket[]
> {
  const response = await fetchBinanceMarketData("/api/v3/exchangeInfo", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Binance exchangeInfo request failed: ${response.status} ${response.statusText}`,
    );
  }

  const exchangeInfo = (await response.json()) as BinanceExchangeInfo;
  return exchangeInfo.symbols
    .filter(
      (symbol) =>
        symbol.status === "TRADING" &&
        symbol.quoteAsset === "USDT" &&
        symbol.isSpotTradingAllowed !== false,
    )
    .map((symbol) => ({
      symbol: symbol.symbol,
      baseAsset: symbol.baseAsset,
    }))
    .sort((first, second) => first.symbol.localeCompare(second.symbol));
}

async function fetchBinanceMarketData(path: string, init: RequestInit) {
  let lastError: unknown;
  let lastResponse: Response | null = null;

  for (const baseUrl of getBinanceBaseUrls()) {
    try {
      const response = await fetch(`${baseUrl}${path}`, init);

      if (response.ok) {
        return response;
      }

      lastResponse = response;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastResponse) {
    return lastResponse;
  }

  throw new Error(
    `Binance market data request failed: ${
      lastError instanceof Error ? lastError.message : "Unknown network error"
    }`,
  );
}

function getBinanceBaseUrls() {
  const configured = process.env.BINANCE_SPOT_BASE_URLS
    ?.split(",")
    .map((url) => url.trim())
    .filter(Boolean);

  return Array.from(
    new Set(
      configured && configured.length > 0
        ? configured
        : DEFAULT_BINANCE_SPOT_BASE_URLS,
    ),
  );
}

function normalizeKline(kline: BinanceKline): Candle {
  return {
    openTime: kline[0],
    open: Number(kline[1]),
    high: Number(kline[2]),
    low: Number(kline[3]),
    close: Number(kline[4]),
    volume: Number(kline[5]),
    quoteVolume: Number(kline[7]),
    closeTime: kline[6],
  };
}
