import type { TableCoin } from "@/components/SignalTable";

export type ScanUniverse =
  | "default"
  | "top100"
  | "top200"
  | "top500"
  | "binance"
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

export type ScanResult = {
  coin: string;
  exchange?: string;
  sourceSymbol?: string;
  ok: boolean;
  data?: TableCoin;
  error?: string;
};

export type ScanResponse = {
  scanType: string;
  startedAt: string;
  finishedAt: string;
  coinsScanned: number;
  universe?: string;
  persistence?: {
    saved: boolean;
    reason?: string;
    scanId?: string;
    resultsSaved?: number;
  };
  alerts?: {
    sent: number;
    skipped: number;
    reason?: string;
    failures?: {
      symbol: string;
      error: string;
    }[];
  };
  note?: string;
  results: ScanResult[];
};

export function buildScanUrl({
  universe,
  persist,
  alerts,
}: {
  universe: ScanUniverse;
  persist: boolean;
  alerts: boolean;
}) {
  const params = new URLSearchParams();

  if (universe !== "default") {
    params.set("universe", universe);
  }

  if (persist) {
    params.set("persist", "true");
  }

  if (alerts) {
    params.set("alerts", "true");
  }

  const query = params.toString();
  return query ? `/api/scan?${query}` : "/api/scan";
}
