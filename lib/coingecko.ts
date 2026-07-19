import { getBinanceUsdtSpotSymbols } from "./binance.ts";
import type { ScanCoin } from "./scanner.ts";

const COINGECKO_BASE_URL = "https://api.coingecko.com/api/v3";
const COINGECKO_MARKETS_PAGE_SIZE = 250;

export type CoinGeckoMarketCoin = {
  id: string;
  symbol: string;
  name: string;
  current_price: number | null;
  market_cap_rank: number | null;
  total_volume: number | null;
};

type CoinGeckoTrendingResponse = {
  coins: {
    item: {
      id: string;
      name: string;
      symbol: string;
      market_cap_rank: number | null;
    };
  }[];
};

const stablecoinSymbols = new Set([
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
]);

export type CoinUniverseLimit = 100 | 200 | 500;
export type CoinCategoryUniverse = "ai" | "gaming" | "rwa" | "meme";

const categoryIds: Record<CoinCategoryUniverse, string> = {
  ai: "artificial-intelligence",
  gaming: "gaming",
  rwa: "real-world-assets-rwa",
  meme: "meme-token",
};

export async function getTopCoins(
  limit: CoinUniverseLimit = 100,
  category?: CoinCategoryUniverse,
) {
  const pageSize = Math.min(limit, COINGECKO_MARKETS_PAGE_SIZE);
  const pages = Math.ceil(limit / pageSize);
  const requests = Array.from({ length: pages }, (_, index) =>
    getTopCoinsPage({
      page: index + 1,
      perPage: pageSize,
      category,
    }),
  );

  const results = await Promise.all(requests);
  return results.flat().slice(0, limit);
}

export async function getTopBinanceUsdtUniverse(
  limit: CoinUniverseLimit = 100,
  category?: CoinCategoryUniverse,
): Promise<{ candidates: number; coins: ScanCoin[] }> {
  const [topCoins, binanceSymbols] = await Promise.all([
    getTopCoins(limit, category),
    getBinanceUsdtSpotSymbols(),
  ]);
  const coins = normalizeMarketCoins(topCoins).filter((coin) =>
    binanceSymbols.has(coin.symbol),
  );

  return {
    candidates: topCoins.length,
    coins,
  };
}

async function getTopCoinsPage({
  page,
  perPage,
  category,
}: {
  page: number;
  perPage: number;
  category?: CoinCategoryUniverse;
}) {
  const params = new URLSearchParams({
    vs_currency: "usd",
    order: "market_cap_desc",
    per_page: String(perPage),
    page: String(page),
    sparkline: "false",
    locale: "en",
  });

  if (category) {
    params.set("category", categoryIds[category]);
  }

  const response = await fetch(
    `${COINGECKO_BASE_URL}/coins/markets?${params.toString()}`,
    {
      next: { revalidate: 900 },
    },
  );

  if (!response.ok) {
    throw new Error(
      `CoinGecko markets request failed: ${response.status} ${response.statusText}`,
    );
  }

  return (await response.json()) as CoinGeckoMarketCoin[];
}

export async function getTopBinanceUsdtCoins(
  limit: CoinUniverseLimit = 100,
  category?: CoinCategoryUniverse,
): Promise<ScanCoin[]> {
  const universe = await getTopBinanceUsdtUniverse(limit, category);
  return universe.coins;
}

export async function getTrendingBinanceUsdtCoins(): Promise<ScanCoin[]> {
  const [trending, binanceSymbols] = await Promise.all([
    getTrendingCoins(),
    getBinanceUsdtSpotSymbols(),
  ]);

  return trending
    .filter((coin) => !stablecoinSymbols.has(coin.symbol.toLowerCase()))
    .map((coin) => ({
      name: coin.name,
      symbol: `${coin.symbol.toUpperCase()}USDT`,
      marketCapRank: coin.market_cap_rank ?? 9999,
      coingeckoId: coin.id,
      trending: true,
    }))
    .filter((coin) => binanceSymbols.has(coin.symbol));
}

export async function getTrendingSymbols(): Promise<Set<string>> {
  const coins = await getTrendingBinanceUsdtCoins();
  return new Set(coins.map((coin) => coin.symbol));
}

async function getTrendingCoins() {
  const response = await fetch(`${COINGECKO_BASE_URL}/search/trending`, {
    next: { revalidate: 900 },
  });

  if (!response.ok) {
    throw new Error(
      `CoinGecko trending request failed: ${response.status} ${response.statusText}`,
    );
  }

  const trending = (await response.json()) as CoinGeckoTrendingResponse;
  return trending.coins.map(({ item }) => ({
    id: item.id,
    name: item.name,
    symbol: item.symbol,
    market_cap_rank: item.market_cap_rank,
    current_price: null,
    total_volume: null,
  }));
}

function normalizeMarketCoins(coins: CoinGeckoMarketCoin[]) {
  return coins
    .filter((coin) => coin.market_cap_rank !== null)
    .filter((coin) => !stablecoinSymbols.has(coin.symbol.toLowerCase()))
    .map((coin) => ({
      name: coin.name,
      symbol: `${coin.symbol.toUpperCase()}USDT`,
      marketCapRank: coin.market_cap_rank ?? 9999,
      volume24h: coin.total_volume ?? undefined,
      coingeckoId: coin.id,
      isStablecoin: false,
    }));
}
