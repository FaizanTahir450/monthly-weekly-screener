import { NextResponse } from "next/server";
import { backtestSignals } from "@/lib/backtest";
import { getExchangeWeeklyCandles, type ExchangeId } from "@/lib/exchanges";
import { loadSavedSignalRows } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const sampleSignals = [
  {
    symbol: "SOLUSDT",
    signalDate: "2025-04-28",
    entryPrice: 145.2,
    futureCloses: [
      151.4, 158.3, 154.1, 166.8, 171.2, 169.4, 178.5, 183.6, 176.1, 188.4,
      192.7, 198.3,
    ],
  },
  {
    symbol: "LINKUSDT",
    signalDate: "2025-07-07",
    entryPrice: 14.8,
    futureCloses: [
      14.2, 13.9, 15.1, 15.8, 16.2, 15.7, 16.9, 17.3, 16.8, 18.4, 18.1,
      19.2,
    ],
  },
];

export async function GET() {
  const savedSignals = await loadSavedSignalRows();

  if (savedSignals.rows.length > 0) {
    const signals = await Promise.all(
      savedSignals.rows.map(async (row) => {
        const exchange = normalizeExchange(row.exchange);
        const sourceSymbol = row.source_symbol ?? row.symbol;
        const candles = await getExchangeWeeklyCandles({
          exchange,
          sourceSymbol,
        });
        const signalTime = new Date(row.created_at).getTime();
        const futureCloses = candles
          .filter(
            (candle) =>
              candle.closeTime !== undefined && candle.closeTime > signalTime,
          )
          .slice(0, 12)
          .map((candle) => candle.close);

        return {
          symbol: row.symbol,
          exchange,
          signalDate: row.created_at,
          entryPrice: Number(row.weekly_close),
          futureCloses,
        };
      }),
    );

    return NextResponse.json({
      mode: "supabase",
      sourceRows: savedSignals.rows.length,
      ...backtestSignals(signals),
    });
  }

  return NextResponse.json({
    mode: "sample",
    note:
      savedSignals.reason ??
      "No saved Supabase SIGNAL rows found yet, so sample signals are shown.",
    ...backtestSignals(sampleSignals),
  });
}

function normalizeExchange(exchange: string | null): ExchangeId {
  return exchange === "BYBIT" || exchange === "OKX" ? exchange : "BINANCE";
}
