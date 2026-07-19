import { NextResponse } from "next/server";
import { defaultSettings } from "@/lib/settings";
import { loadStrategySettings, saveStrategySettings } from "@/lib/supabase";
import type { AutomationSettings, StrategySettings } from "@/lib/types";

export const dynamic = "force-dynamic";

const switchKeys = [
  "monthlyRsiFilter",
  "weeklyGreenCandleFilter",
  "weeklyCloseBreakoutFilter",
  "volumeConfirmationFilter",
  "topMarketCapFilter",
  "minimumVolumeFilter",
  "stablecoinFilter",
  "duplicateAlertFilter",
  "btcTrendFilter",
  "trendingCoinBoost",
  "dailyScanEnabled",
  "weeklyScanEnabled",
  "persistScansDefault",
  "telegramAlertsDefault",
] as const;

const valueKeys = [
  "rsiLength",
  "perfectRsiMin",
  "perfectRsiMax",
  "signalRsiMin",
  "signalRsiMax",
  "watchlistRsiMin",
  "watchlistRsiMax",
  "minimum24hVolume",
  "alertMinimumStars",
  "maxMarketCapRank",
] as const;

const automationKeys = ["defaultScanUniverse"] as const;

export async function GET() {
  const loaded = await loadStrategySettings();
  const settings = loaded.settings;

  return NextResponse.json({
    settings,
    switches: Object.fromEntries(
      switchKeys.map((key) => [key, settings[key]]),
    ),
    values: Object.fromEntries(
      valueKeys.map((key) => [key, settings[key]]),
    ),
    automation: Object.fromEntries(
      automationKeys.map((key) => [key, settings[key]]),
    ) as Pick<AutomationSettings, (typeof automationKeys)[number]>,
    source: loaded.source,
    persistence:
      loaded.source === "supabase"
        ? "loaded from Supabase"
        : "using defaults because Supabase env vars are not configured",
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<StrategySettings>;
  const result = await saveStrategySettings(body);

  return NextResponse.json({
    ...result,
    settings: {
      ...defaultSettings,
      ...body,
    },
  });
}
