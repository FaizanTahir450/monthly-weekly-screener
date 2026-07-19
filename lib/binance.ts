import type { Candle } from "./indicators.ts";

const BINANCE_SPOT_BASE_URL = "https://api.binance.com";

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
  const url = `${BINANCE_SPOT_BASE_URL}/api/v3/klines?${params.toString()}`;
  const response = await fetch(url, {
    next: { revalidate: 60 },
  });

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
  const response = await fetch(`${BINANCE_SPOT_BASE_URL}/api/v3/exchangeInfo`, {
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
