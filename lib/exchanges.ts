import {
  getBinanceUsdtSpotMarkets,
  getMonthlyCandles as getBinanceMonthlyCandles,
  getWeeklyCandles as getBinanceWeeklyCandles,
} from "./binance.ts";
import type { Candle } from "./indicators.ts";

const DEFAULT_BYBIT_REST_BASE_URLS = [
  "https://api.bybit.com",
  "https://api.bytick.com",
];
const DEFAULT_OKX_REST_BASE_URL = "https://openapi.okx.com";
const FALLBACK_OKX_REST_BASE_URL = "https://www.okx.com";
const KUCOIN_BASE_URL = "https://api.kucoin.com";
const GATE_BASE_URL = "https://api.gateio.ws";
const MEXC_BASE_URL = "https://api.mexc.com";
const BITGET_BASE_URL = "https://api.bitget.com";
const DEFAULT_EXCHANGE_RETRY_ATTEMPTS = 6;
const DEFAULT_EXCHANGE_RETRY_DELAY_MS = 1500;
const MAX_EXCHANGE_RETRY_DELAY_MS = 30000;

export type ExchangeId =
  | "BINANCE"
  | "BYBIT"
  | "OKX"
  | "KUCOIN"
  | "GATE"
  | "MEXC"
  | "BITGET";

export type ExchangeMarket = {
  exchange: ExchangeId;
  symbol: string;
  sourceSymbol: string;
  baseAsset: string;
};

const exchangeIds = new Set<string>([
  "BINANCE",
  "BYBIT",
  "OKX",
  "KUCOIN",
  "GATE",
  "MEXC",
  "BITGET",
]);

type BybitInstrumentsResponse = {
  retCode: number;
  retMsg: string;
  result?: {
    nextPageCursor?: string;
    list?: {
      symbol: string;
      baseCoin: string;
      quoteCoin: string;
      status: string;
    }[];
  };
};

type BybitKlineResponse = {
  retCode: number;
  retMsg: string;
  result?: {
    list?: [string, string, string, string, string, string, string][];
  };
};

type OkxInstrumentsResponse = {
  code: string;
  msg: string;
  data?: {
    instId: string;
    baseCcy: string;
    quoteCcy: string;
    state: string;
  }[];
};

type OkxCandlesResponse = {
  code: string;
  msg: string;
  data?: [string, string, string, string, string, string, string, string, string][];
};

type KucoinSymbolsResponse = {
  code: string;
  data?: {
    symbol: string;
    baseCurrency: string;
    quoteCurrency: string;
    enableTrading: boolean;
  }[];
};

type KucoinKlinesResponse = {
  code: string;
  data?: [number, string, string, string, string, string, string][];
};

type GateCurrencyPair = {
  id: string;
  base: string;
  quote: string;
  trade_status: string;
};

type GateCandlestick = [string, string, string, string, string, string, string?];

type MexcExchangeInfoResponse = {
  symbols?: {
    symbol: string;
    status: string;
    baseAsset: string;
    quoteAsset: string;
    isSpotTradingAllowed?: boolean;
  }[];
};

type MexcKline = [
  number,
  string,
  string,
  string,
  string,
  string,
  number,
  string,
];

type BitgetSymbolsResponse = {
  code: string;
  msg: string;
  data?: {
    symbol: string;
    baseCoin: string;
    quoteCoin: string;
    status: string;
  }[];
};

type BitgetCandlesResponse = {
  code: string;
  msg: string;
  data?: [string, string, string, string, string, string, string, string][];
};

export function normalizeExchangeId(
  exchange: string | null | undefined,
): ExchangeId {
  return exchange && exchangeIds.has(exchange)
    ? (exchange as ExchangeId)
    : "BINANCE";
}

export async function getMultiExchangeUsdtSpotMarkets({
  allowPartial = false,
  dedupe = true,
}: {
  allowPartial?: boolean;
  dedupe?: boolean;
} = {}) {
  const [
    binanceSource,
    bybitSource,
    okxSource,
    kucoinSource,
    gateSource,
    mexcSource,
    bitgetSource,
  ] = await Promise.all([
    loadMarketSource("Binance", async () =>
      (await getBinanceUsdtSpotMarkets()).map((market) => ({
        exchange: "BINANCE" as const,
        symbol: market.symbol,
        sourceSymbol: market.symbol,
        baseAsset: market.baseAsset,
      })),
    ),
    loadMarketSource("Bybit", getBybitUsdtSpotMarkets),
    loadMarketSource("OKX", getOkxUsdtSpotMarkets),
    loadMarketSource("KuCoin", getKucoinUsdtSpotMarkets),
    loadMarketSource("Gate.io", getGateUsdtSpotMarkets),
    loadMarketSource("MEXC", getMexcUsdtSpotMarkets),
    loadMarketSource("Bitget", getBitgetUsdtSpotMarkets),
  ]);
  const binance = binanceSource.markets;
  const bybit = bybitSource.markets;
  const okx = okxSource.markets;
  const kucoin = kucoinSource.markets;
  const gate = gateSource.markets;
  const mexc = mexcSource.markets;
  const bitget = bitgetSource.markets;
  const sources = [
    binanceSource,
    bybitSource,
    okxSource,
    kucoinSource,
    gateSource,
    mexcSource,
    bitgetSource,
  ];
  const unavailable = sources
    .filter((source) => source.error)
    .map((source) => ({
      name: source.name,
      error: source.error as string,
    }));
  const allMarkets: ExchangeMarket[] = [
    ...binance,
    ...bybit,
    ...okx,
    ...kucoin,
    ...gate,
    ...mexc,
    ...bitget,
  ];

  if ((!allowPartial && unavailable.length > 0) || allMarkets.length === 0) {
    const errors = sources
      .map((source) =>
        source.error
          ? `${source.name}: ${source.error}`
          : `${source.name}: loaded ${source.markets.length} markets`,
      )
      .join("; ");
    throw new Error(
      `Multi-exchange scan could not load every exchange source after retries. ${errors}`,
    );
  }

  const uniqueSymbolCount = new Set(allMarkets.map((market) => market.symbol))
    .size;
  const seenSymbols = new Set<string>();
  const markets = dedupe
    ? allMarkets
    .filter((market) => {
      if (seenSymbols.has(market.symbol)) {
        return false;
      }

      seenSymbols.add(market.symbol);
      return true;
    })
    : allMarkets;
  const sortedMarkets = markets.sort(
    (first, second) =>
      first.symbol.localeCompare(second.symbol) ||
      first.exchange.localeCompare(second.exchange),
  );

  return {
    markets: sortedMarkets,
    counts: {
      binance: binance.length,
      bybit: bybit.length,
      okx: okx.length,
      kucoin: kucoin.length,
      gate: gate.length,
      mexc: mexc.length,
      bitget: bitget.length,
      unique: uniqueSymbolCount,
      selected: sortedMarkets.length,
    },
    unavailable,
  };
}

async function loadMarketSource(
  name: string,
  loader: () => Promise<ExchangeMarket[]>,
) {
  try {
    return {
      name,
      markets: await retryExchangeRequest(
        `${name} market list`,
        loader,
      ),
      error: null,
    };
  } catch (error) {
    return {
      name,
      markets: [],
      error: error instanceof Error ? error.message : "Unknown exchange error",
    };
  }
}

export async function getExchangeWeeklyCandles({
  exchange,
  sourceSymbol,
}: {
  exchange?: ExchangeId;
  sourceSymbol: string;
}) {
  switch (exchange) {
    case "BYBIT":
      return retryExchangeRequest(`${sourceSymbol} Bybit weekly candles`, () =>
        getBybitCandles(sourceSymbol, "W", 80),
      );
    case "OKX":
      return retryExchangeRequest(`${sourceSymbol} OKX weekly candles`, () =>
        getOkxCandles(sourceSymbol, "1W", 80),
      );
    case "KUCOIN":
      return retryExchangeRequest(`${sourceSymbol} KuCoin weekly candles`, () =>
        getKucoinCandles(sourceSymbol, "1week", 80),
      );
    case "GATE":
      return retryExchangeRequest(`${sourceSymbol} Gate.io weekly candles`, () =>
        getGateCandles(sourceSymbol, "1w", 80),
      );
    case "MEXC":
      return retryExchangeRequest(`${sourceSymbol} MEXC weekly candles`, () =>
        getMexcCandles(sourceSymbol, "1w", 80),
      );
    case "BITGET":
      return retryExchangeRequest(`${sourceSymbol} Bitget weekly candles`, () =>
        getBitgetCandles(sourceSymbol, "1Wutc", 80),
      );
    default:
      return retryExchangeRequest(
        `${sourceSymbol} Binance weekly candles`,
        () => getBinanceWeeklyCandles(sourceSymbol),
      );
  }
}

export async function getExchangeMonthlyCandles({
  exchange,
  sourceSymbol,
}: {
  exchange?: ExchangeId;
  sourceSymbol: string;
}) {
  switch (exchange) {
    case "BYBIT":
      return retryExchangeRequest(`${sourceSymbol} Bybit monthly candles`, () =>
        getBybitCandles(sourceSymbol, "M", 30),
      );
    case "OKX":
      return retryExchangeRequest(`${sourceSymbol} OKX monthly candles`, () =>
        getOkxCandles(sourceSymbol, "1M", 30),
      );
    case "KUCOIN":
      return retryExchangeRequest(`${sourceSymbol} KuCoin monthly candles`, () =>
        getKucoinCandles(sourceSymbol, "1month", 30),
      );
    case "GATE":
      return retryExchangeRequest(`${sourceSymbol} Gate.io monthly candles`, () =>
        getGateCandles(sourceSymbol, "30d", 30),
      );
    case "MEXC":
      return retryExchangeRequest(`${sourceSymbol} MEXC monthly candles`, () =>
        getMexcCandles(sourceSymbol, "1M", 30),
      );
    case "BITGET":
      return retryExchangeRequest(`${sourceSymbol} Bitget monthly candles`, () =>
        getBitgetCandles(sourceSymbol, "1Mutc", 30),
      );
    default:
      return retryExchangeRequest(
        `${sourceSymbol} Binance monthly candles`,
        () => getBinanceMonthlyCandles(sourceSymbol),
      );
  }
}

async function retryExchangeRequest<T>(
  label: string,
  request: () => Promise<T>,
) {
  const attempts = getExchangeRetryAttempts();
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await request();
    } catch (error) {
      lastError = error;

      if (attempt === attempts) {
        break;
      }

      await sleep(getRetryDelayMs(attempt));
    }
  }

  throw new Error(`${label} failed after ${attempts} attempts: ${formatError(lastError)}`);
}

function getExchangeRetryAttempts() {
  const configured = Number(process.env.EXCHANGE_FETCH_RETRIES);

  if (Number.isFinite(configured) && configured >= 1) {
    return Math.min(Math.floor(configured), 20);
  }

  return DEFAULT_EXCHANGE_RETRY_ATTEMPTS;
}

function getRetryDelayMs(attempt: number) {
  const configured = Number(process.env.EXCHANGE_RETRY_DELAY_MS);
  const baseDelay =
    Number.isFinite(configured) && configured >= 250
      ? configured
      : DEFAULT_EXCHANGE_RETRY_DELAY_MS;

  return Math.min(baseDelay * 2 ** (attempt - 1), MAX_EXCHANGE_RETRY_DELAY_MS);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message : "Unknown exchange error";
}

async function getBybitUsdtSpotMarkets(): Promise<ExchangeMarket[]> {
  const markets: ExchangeMarket[] = [];
  let cursor: string | undefined;

  do {
    const params = new URLSearchParams({
      category: "spot",
      limit: "1000",
    });

    if (cursor) {
      params.set("cursor", cursor);
    }

    const response = await fetchBybit(
      `/v5/market/instruments-info?${params.toString()}`,
      { next: { revalidate: 900 } },
    );

    if (!response.ok) {
      throw new Error(
        `Bybit instruments request failed: ${response.status} ${response.statusText}`,
      );
    }

    const payload = (await response.json()) as BybitInstrumentsResponse;

    if (payload.retCode !== 0) {
      throw new Error(`Bybit instruments request failed: ${payload.retMsg}`);
    }

    markets.push(
      ...(payload.result?.list ?? [])
        .filter(
          (market) =>
            market.status === "Trading" && market.quoteCoin === "USDT",
        )
        .map((market) => ({
          exchange: "BYBIT" as const,
          symbol: market.symbol,
          sourceSymbol: market.symbol,
          baseAsset: market.baseCoin,
        })),
    );
    cursor = payload.result?.nextPageCursor || undefined;
  } while (cursor);

  return markets;
}

async function getOkxUsdtSpotMarkets(): Promise<ExchangeMarket[]> {
  const response = await fetchOkx(
    "/api/v5/public/instruments",
    new URLSearchParams({ instType: "SPOT" }),
  );

  if (!response.ok) {
    throw new Error(
      `OKX instruments request failed: ${response.status} ${response.statusText}`,
    );
  }

  const payload = (await response.json()) as OkxInstrumentsResponse;

  if (payload.code !== "0") {
    throw new Error(`OKX instruments request failed: ${payload.msg}`);
  }

  return (payload.data ?? [])
    .filter(
      (market) => market.state === "live" && market.quoteCcy === "USDT",
    )
    .map((market) => ({
      exchange: "OKX" as const,
      symbol: market.instId.replace(/-/g, ""),
      sourceSymbol: market.instId,
      baseAsset: market.baseCcy,
    }));
}

async function getKucoinUsdtSpotMarkets(): Promise<ExchangeMarket[]> {
  const response = await fetch(`${KUCOIN_BASE_URL}/api/v2/symbols`, {
    next: { revalidate: 900 },
  });

  if (!response.ok) {
    throw new Error(
      `KuCoin symbols request failed: ${response.status} ${response.statusText}`,
    );
  }

  const payload = (await response.json()) as KucoinSymbolsResponse;

  if (payload.code !== "200000") {
    throw new Error(`KuCoin symbols request failed: ${payload.code}`);
  }

  return (payload.data ?? [])
    .filter(
      (market) => market.enableTrading && market.quoteCurrency === "USDT",
    )
    .map((market) => ({
      exchange: "KUCOIN" as const,
      symbol: market.symbol.replace(/-/g, ""),
      sourceSymbol: market.symbol,
      baseAsset: market.baseCurrency,
    }));
}

async function getGateUsdtSpotMarkets(): Promise<ExchangeMarket[]> {
  const response = await fetch(`${GATE_BASE_URL}/api/v4/spot/currency_pairs`, {
    next: { revalidate: 900 },
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(
      `Gate.io currency pairs request failed: ${response.status} ${response.statusText}`,
    );
  }

  const payload = (await response.json()) as GateCurrencyPair[];
  return payload
    .filter(
      (market) => market.trade_status === "tradable" && market.quote === "USDT",
    )
    .map((market) => ({
      exchange: "GATE" as const,
      symbol: market.id.replace(/_/g, ""),
      sourceSymbol: market.id,
      baseAsset: market.base,
    }));
}

async function getMexcUsdtSpotMarkets(): Promise<ExchangeMarket[]> {
  const response = await fetch(`${MEXC_BASE_URL}/api/v3/exchangeInfo`, {
    next: { revalidate: 900 },
  });

  if (!response.ok) {
    throw new Error(
      `MEXC exchangeInfo request failed: ${response.status} ${response.statusText}`,
    );
  }

  const payload = (await response.json()) as MexcExchangeInfoResponse;
  return (payload.symbols ?? [])
    .filter(
      (market) =>
        market.status === "ENABLED" &&
        market.quoteAsset === "USDT" &&
        market.isSpotTradingAllowed !== false,
    )
    .map((market) => ({
      exchange: "MEXC" as const,
      symbol: market.symbol,
      sourceSymbol: market.symbol,
      baseAsset: market.baseAsset,
    }));
}

async function getBitgetUsdtSpotMarkets(): Promise<ExchangeMarket[]> {
  const response = await fetch(`${BITGET_BASE_URL}/api/v2/spot/public/symbols`, {
    next: { revalidate: 900 },
  });

  if (!response.ok) {
    throw new Error(
      `Bitget symbols request failed: ${response.status} ${response.statusText}`,
    );
  }

  const payload = (await response.json()) as BitgetSymbolsResponse;

  if (payload.code !== "00000") {
    throw new Error(`Bitget symbols request failed: ${payload.msg}`);
  }

  return (payload.data ?? [])
    .filter((market) => market.status === "online" && market.quoteCoin === "USDT")
    .map((market) => ({
      exchange: "BITGET" as const,
      symbol: market.symbol,
      sourceSymbol: market.symbol,
      baseAsset: market.baseCoin,
    }));
}

async function getBybitCandles(
  symbol: string,
  interval: "W" | "M",
  limit: number,
): Promise<Candle[]> {
  const params = new URLSearchParams({
    category: "spot",
    symbol,
    interval,
    limit: String(limit),
  });
  const response = await fetchBybit(
    `/v5/market/kline?${params.toString()}`,
    { next: { revalidate: 60 } },
  );

  if (!response.ok) {
    throw new Error(
      `Bybit kline request failed for ${symbol}: ${response.status} ${response.statusText}`,
    );
  }

  const payload = (await response.json()) as BybitKlineResponse;

  if (payload.retCode !== 0) {
    throw new Error(`Bybit kline request failed for ${symbol}: ${payload.retMsg}`);
  }

  return (payload.result?.list ?? [])
    .map((kline) => ({
      openTime: Number(kline[0]),
      open: Number(kline[1]),
      high: Number(kline[2]),
      low: Number(kline[3]),
      close: Number(kline[4]),
      volume: Number(kline[5]),
      quoteVolume: Number(kline[6]),
      closeTime: getCloseTime(Number(kline[0]), interval),
    }))
    .sort((first, second) => first.openTime - second.openTime);
}

async function getOkxCandles(
  symbol: string,
  bar: "1W" | "1M",
  limit: number,
): Promise<Candle[]> {
  const params = new URLSearchParams({
    instId: symbol,
    bar,
    limit: String(limit),
  });
  const response = await fetchOkx("/api/v5/market/candles", params);

  if (!response.ok) {
    throw new Error(
      `OKX candle request failed for ${symbol}: ${response.status} ${response.statusText}`,
    );
  }

  const payload = (await response.json()) as OkxCandlesResponse;

  if (payload.code !== "0") {
    throw new Error(`OKX candle request failed for ${symbol}: ${payload.msg}`);
  }

  return (payload.data ?? [])
    .map((candle) => ({
      openTime: Number(candle[0]),
      open: Number(candle[1]),
      high: Number(candle[2]),
      low: Number(candle[3]),
      close: Number(candle[4]),
      volume: Number(candle[5]),
      quoteVolume: Number(candle[7]),
      closeTime: getCloseTime(Number(candle[0]), bar),
    }))
    .sort((first, second) => first.openTime - second.openTime);
}

async function getKucoinCandles(
  symbol: string,
  interval: "1week" | "1month",
  limit: number,
): Promise<Candle[]> {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const lookbackSeconds =
    interval === "1week"
      ? limit * 7 * 24 * 60 * 60
      : limit * 31 * 24 * 60 * 60;
  const params = new URLSearchParams({
    tradeType: "SPOT",
    symbol,
    interval,
    startAt: String(nowSeconds - lookbackSeconds * 2),
    endAt: String(nowSeconds),
  });
  const response = await fetch(
    `${KUCOIN_BASE_URL}/api/ua/v1/market/kline?${params.toString()}`,
    { next: { revalidate: 60 } },
  );

  if (!response.ok) {
    throw new Error(
      `KuCoin kline request failed for ${symbol}: ${response.status} ${response.statusText}`,
    );
  }

  const payload = (await response.json()) as KucoinKlinesResponse;

  if (payload.code !== "200000") {
    throw new Error(`KuCoin kline request failed for ${symbol}: ${payload.code}`);
  }

  return (payload.data ?? [])
    .slice(-limit)
    .map((kline) => {
      const openTime = Number(kline[0]) * 1000;

      return {
        openTime,
        open: Number(kline[1]),
        close: Number(kline[2]),
        high: Number(kline[3]),
        low: Number(kline[4]),
        volume: Number(kline[5]),
        quoteVolume: Number(kline[6]),
        closeTime: getCloseTime(openTime, interval),
      };
    })
    .sort((first, second) => first.openTime - second.openTime);
}

async function getGateCandles(
  symbol: string,
  interval: "1w" | "30d",
  limit: number,
): Promise<Candle[]> {
  const params = new URLSearchParams({
    currency_pair: symbol,
    interval,
    limit: String(limit),
  });
  const response = await fetch(
    `${GATE_BASE_URL}/api/v4/spot/candlesticks?${params.toString()}`,
    {
      next: { revalidate: 60 },
      headers: { Accept: "application/json" },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Gate.io candlestick request failed for ${symbol}: ${response.status} ${response.statusText}`,
    );
  }

  const payload = (await response.json()) as GateCandlestick[];
  return payload
    .map((candle) => {
      const openTime = Number(candle[0]) * 1000;

      return {
        openTime,
        volume: Number(candle[1]),
        close: Number(candle[2]),
        high: Number(candle[3]),
        low: Number(candle[4]),
        open: Number(candle[5]),
        quoteVolume: candle[6] === undefined ? undefined : Number(candle[6]),
        closeTime: getCloseTime(openTime, interval),
      };
    })
    .sort((first, second) => first.openTime - second.openTime);
}

async function getMexcCandles(
  symbol: string,
  interval: "1w" | "1M",
  limit: number,
): Promise<Candle[]> {
  const params = new URLSearchParams({
    symbol,
    interval,
    limit: String(limit),
  });
  const response = await fetch(
    `${MEXC_BASE_URL}/api/v3/klines?${params.toString()}`,
    { next: { revalidate: 60 } },
  );

  if (!response.ok) {
    throw new Error(
      `MEXC kline request failed for ${symbol}: ${response.status} ${response.statusText}`,
    );
  }

  const payload = (await response.json()) as MexcKline[];
  return payload
    .map((kline) => ({
      openTime: Number(kline[0]),
      open: Number(kline[1]),
      high: Number(kline[2]),
      low: Number(kline[3]),
      close: Number(kline[4]),
      volume: Number(kline[5]),
      quoteVolume: Number(kline[7]),
      closeTime: Number(kline[6]),
    }))
    .sort((first, second) => first.openTime - second.openTime);
}

async function getBitgetCandles(
  symbol: string,
  granularity: "1Wutc" | "1Mutc",
  limit: number,
): Promise<Candle[]> {
  const params = new URLSearchParams({
    symbol,
    granularity,
    limit: String(limit),
  });
  const response = await fetch(
    `${BITGET_BASE_URL}/api/v2/spot/market/candles?${params.toString()}`,
    { next: { revalidate: 60 } },
  );

  if (!response.ok) {
    throw new Error(
      `Bitget candle request failed for ${symbol}: ${response.status} ${response.statusText}`,
    );
  }

  const payload = (await response.json()) as BitgetCandlesResponse;

  if (payload.code !== "00000") {
    throw new Error(`Bitget candle request failed for ${symbol}: ${payload.msg}`);
  }

  return (payload.data ?? [])
    .map((candle) => {
      const openTime = Number(candle[0]);

      return {
        openTime,
        open: Number(candle[1]),
        high: Number(candle[2]),
        low: Number(candle[3]),
        close: Number(candle[4]),
        volume: Number(candle[5]),
        quoteVolume: Number(candle[6]),
        closeTime: getCloseTime(openTime, granularity),
      };
    })
    .sort((first, second) => first.openTime - second.openTime);
}

async function fetchBybit(path: string, init: RequestInit) {
  let lastError: unknown;
  let lastResponse: Response | null = null;

  for (const baseUrl of getBybitBaseUrls()) {
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

  throw new Error(`Bybit request failed: ${formatError(lastError)}`);
}

function getBybitBaseUrls() {
  const configured = process.env.BYBIT_REST_BASE_URLS
    ?.split(",")
    .map((url) => url.trim())
    .filter(Boolean);

  return Array.from(
    new Set(
      configured && configured.length > 0
        ? configured
        : DEFAULT_BYBIT_REST_BASE_URLS,
    ),
  );
}

async function fetchOkx(path: string, params: URLSearchParams) {
  const urls = getOkxBaseUrls().map(
    (baseUrl) => `${baseUrl}${path}?${params.toString()}`,
  );
  let lastError: unknown;
  let lastResponse: Response | null = null;

  for (const url of urls) {
    try {
      const response = await fetch(url, { next: { revalidate: 60 } });

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

  throw new Error(`OKX request failed: ${formatError(lastError)}`);
}

function getOkxBaseUrls() {
  return Array.from(
    new Set([
      process.env.OKX_REST_BASE_URL || DEFAULT_OKX_REST_BASE_URL,
      DEFAULT_OKX_REST_BASE_URL,
      FALLBACK_OKX_REST_BASE_URL,
    ]),
  );
}

function getCloseTime(
  openTime: number,
  interval:
    | "W"
    | "M"
    | "1W"
    | "1M"
    | "1week"
    | "1month"
    | "1w"
    | "30d"
    | "1Wutc"
    | "1Mutc",
) {
  const openDate = new Date(openTime);

  if (
    interval === "W" ||
    interval === "1W" ||
    interval === "1week" ||
    interval === "1w" ||
    interval === "1Wutc"
  ) {
    return openTime + 7 * 24 * 60 * 60 * 1000 - 1;
  }

  return Date.UTC(
    openDate.getUTCFullYear(),
    openDate.getUTCMonth() + 1,
    1,
  ) - 1;
}
