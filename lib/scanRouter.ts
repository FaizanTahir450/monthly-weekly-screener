import {
  runAllBinanceUsdtScan,
  runCategoryScan,
  runConfiguredFeedScan,
  runExchangeUsdtScan,
  runManualScan,
  runMultiExchangeUsdtScan,
  runTopCoinScan,
  runTrendingScan,
} from "./scanner.ts";
import { loadStrategySettings } from "./supabase.ts";

export type ScanUniverseParam =
  | "default"
  | "top100"
  | "top200"
  | "top500"
  | "binance"
  | "bybit"
  | "okx"
  | "kucoin"
  | "gate"
  | "mexc"
  | "bitget"
  | "multi"
  | "multi-all"
  | "ai"
  | "gaming"
  | "rwa"
  | "meme"
  | "trending"
  | "recent"
  | "events"
  | "social";

export const scanUniverses: ScanUniverseParam[] = [
  "default",
  "top100",
  "top200",
  "top500",
  "binance",
  "bybit",
  "okx",
  "kucoin",
  "gate",
  "mexc",
  "bitget",
  "multi",
  "multi-all",
  "ai",
  "gaming",
  "rwa",
  "meme",
  "trending",
  "recent",
  "events",
  "social",
];

export async function runScanForUniverse({
  universe,
  persist = false,
  alerts = false,
}: {
  universe: string | null;
  persist?: boolean;
  alerts?: boolean;
}) {
  const { settings } = await loadStrategySettings();

  switch (universe) {
    case "top100":
      return runTopCoinScan({ limit: 100, settings, persist, alerts });
    case "top200":
      return runTopCoinScan({ limit: 200, settings, persist, alerts });
    case "top500":
      return runTopCoinScan({ limit: 500, settings, persist, alerts });
    case "binance":
      return runAllBinanceUsdtScan({ settings, persist, alerts });
    case "bybit":
      return runExchangeUsdtScan({
        exchange: "BYBIT",
        settings,
        persist,
        alerts,
      });
    case "okx":
      return runExchangeUsdtScan({
        exchange: "OKX",
        settings,
        persist,
        alerts,
      });
    case "kucoin":
      return runExchangeUsdtScan({
        exchange: "KUCOIN",
        settings,
        persist,
        alerts,
      });
    case "gate":
      return runExchangeUsdtScan({
        exchange: "GATE",
        settings,
        persist,
        alerts,
      });
    case "mexc":
      return runExchangeUsdtScan({
        exchange: "MEXC",
        settings,
        persist,
        alerts,
      });
    case "bitget":
      return runExchangeUsdtScan({
        exchange: "BITGET",
        settings,
        persist,
        alerts,
      });
    case "multi":
      return runMultiExchangeUsdtScan({ settings, persist, alerts });
    case "multi-all":
      return runMultiExchangeUsdtScan({
        settings,
        persist,
        alerts,
        allMarkets: true,
      });
    case "ai":
    case "gaming":
    case "rwa":
    case "meme":
      return runCategoryScan({ category: universe, settings, persist, alerts });
    case "trending":
      return runTrendingScan({ settings, persist, alerts });
    case "recent":
      return runConfiguredFeedScan({
        feed: "recentlyListed",
        settings,
        persist,
        alerts,
      });
    case "events":
      return runConfiguredFeedScan({ feed: "events", settings, persist, alerts });
    case "social":
      return runConfiguredFeedScan({ feed: "social", settings, persist, alerts });
    default:
      return runManualScan({ settings, persist, alerts });
  }
}
