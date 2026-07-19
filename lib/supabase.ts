import type { ScanResponse, ScanResult } from "./scanner.ts";
import { defaultSettings } from "./settings.ts";
import type { StrategySettings } from "./types.ts";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

type InsertResponse<T> = T[];

export type ScanLogRow = {
  id: string;
  scan_type: string;
  universe: string | null;
  status: string;
  started_at: string;
  finished_at: string | null;
  coins_scanned: number;
  error_message: string | null;
};

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && serviceRoleKey);
}

export async function saveScanResponse(scan: ScanResponse) {
  if (!isSupabaseConfigured()) {
    return {
      saved: false,
      reason: "Supabase env vars are not configured.",
    };
  }

  const scanRows = await insertRows<{ id: string }>("scans", [
    {
      scan_type: scan.scanType,
      universe: scan.universe,
      status: scan.results.some((result) => !result.ok)
        ? "PARTIAL"
        : "SUCCESS",
      started_at: scan.startedAt,
      finished_at: scan.finishedAt,
      coins_scanned: scan.coinsScanned,
      error_message: scan.results
        .filter((result) => !result.ok)
        .map((result) => `${result.coin}: ${result.error}`)
        .join("\n"),
    },
  ]);
  const scanId = scanRows[0]?.id;

  if (!scanId) {
    throw new Error("Supabase did not return a scan id.");
  }

  const successfulResults = scan.results.filter(
    (result): result is ScanResult & { data: NonNullable<ScanResult["data"]> } =>
      Boolean(result.ok && result.data),
  );
  const coinRows = await upsertRows<{
    id: string;
    symbol: string;
  }>(
    "coins",
    successfulResults.map((result) => ({
      symbol: result.data.symbol,
      name: result.data.name,
      exchange: result.data.exchange,
      source_symbol: result.data.sourceSymbol,
      binance_symbol:
        result.data.exchange === "BINANCE" ? result.data.sourceSymbol : null,
      market_cap_rank: result.data.marketCapRank,
      volume_24h: result.data.volume24h,
      is_active: true,
      updated_at: new Date().toISOString(),
    })),
    "symbol",
  );
  const coinIdsBySymbol = new Map(
    coinRows.map((row) => [row.symbol, row.id]),
  );
  const resultRows = scan.results
    .filter(
      (result): result is ScanResult & { data: NonNullable<ScanResult["data"]> } =>
        Boolean(result.ok && result.data),
    )
    .map((result) => {
      const data = result.data;

      return {
        coin_id: coinIdsBySymbol.get(data.symbol),
        symbol: data.symbol,
        exchange: data.exchange,
        source_symbol: data.sourceSymbol,
        price: data.price,
        monthly_rsi: data.monthlyRsi,
        rsi_zone: getRsiZone(data.monthlyRsi),
        weekly_open: data.weeklyOpen,
        weekly_close: data.weeklyClose,
        weekly_high: data.weeklyHigh,
        weekly_low: data.weeklyLow,
        previous_red_high: data.previousRedWeeklyHigh,
        close_break_confirmed: data.checks.weeklyCloseBreakout,
        weekly_green_confirmed: data.checks.weeklyGreen,
        volume_confirmed: data.checks.volume,
        stars: data.stars,
        status: data.status,
        reason: data.reason,
        scan_id: scanId,
      };
    });

  if (resultRows.length > 0) {
    await insertRows("signal_results", resultRows);
  }

  return {
    saved: true,
    scanId,
    resultsSaved: resultRows.length,
  };
}

export async function hasAlertedThisWeek(symbol: string) {
  if (!isSupabaseConfigured()) {
    return false;
  }

  try {
    const weekStart = getUtcWeekStart();
    const params = new URLSearchParams({
      select: "id",
      symbol: `eq.${symbol}`,
      created_at: `gte.${weekStart.toISOString()}`,
      limit: "1",
    });
    const response = await fetch(`${supabaseUrl}/rest/v1/alert_logs?${params}`, {
      headers: {
        apikey: serviceRoleKey ?? "",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    });

    if (!response.ok) {
      return false;
    }

    const rows = (await response.json()) as { id: string }[];
    return rows.length > 0;
  } catch {
    return false;
  }
}

export async function saveAlertLog({
  symbol,
  stars,
  status,
  reason,
}: {
  symbol: string;
  stars: number;
  status: string;
  reason: string;
}) {
  if (!isSupabaseConfigured()) {
    return {
      saved: false,
      reason: "Supabase env vars are not configured.",
    };
  }

  await insertRows("alert_logs", [
    {
      symbol,
      stars,
      status,
      reason,
    },
  ]);

  return {
    saved: true,
  };
}

export async function loadStrategySettings() {
  if (!isSupabaseConfigured()) {
    return {
      settings: defaultSettings,
      source: "defaults",
    };
  }

  try {
    const params = new URLSearchParams({
      select: "key,value,enabled",
    });
    const response = await fetch(
      `${supabaseUrl}/rest/v1/strategy_settings?${params}`,
      {
        headers: {
          apikey: serviceRoleKey ?? "",
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      },
    );

    if (!response.ok) {
      return {
        settings: defaultSettings,
        source: "defaults",
        reason: `Supabase settings lookup failed: ${response.status} ${response.statusText}`,
      };
    }

    const rows = (await response.json()) as {
      key: keyof StrategySettings;
      value: unknown;
      enabled: boolean;
    }[];
    const savedSettings = rows.reduce<Record<string, unknown>>(
      (settings, row) => {
        settings[row.key] =
          typeof defaultSettings[row.key] === "boolean"
            ? row.enabled
            : row.value;
        return settings;
      },
      {},
    ) as Partial<StrategySettings>;

    return {
      settings: {
        ...defaultSettings,
        ...savedSettings,
      },
      source: "supabase",
    };
  } catch (error) {
    return {
      settings: defaultSettings,
      source: "defaults",
      reason:
        error instanceof Error
          ? `Supabase settings unavailable: ${error.message}`
          : "Supabase settings unavailable.",
    };
  }
}

export async function saveStrategySettings(
  settings: Partial<StrategySettings>,
) {
  if (!isSupabaseConfigured()) {
    return {
      saved: false,
      reason: "Supabase env vars are not configured.",
    };
  }

  const rows = Object.entries(settings)
    .filter(([key]) => key in defaultSettings)
    .map(([key, value]) => {
      const defaultValue = defaultSettings[key as keyof StrategySettings];
      const isBooleanSetting = typeof defaultValue === "boolean";

      return {
        key,
        value,
        type: isBooleanSetting ? "boolean" : typeof defaultValue,
        enabled: isBooleanSetting ? Boolean(value) : true,
        updated_at: new Date().toISOString(),
      };
    });

  if (rows.length === 0) {
    return {
      saved: true,
      rowsSaved: 0,
    };
  }

  const response = await fetch(
    `${supabaseUrl}/rest/v1/strategy_settings?on_conflict=key`,
    {
      method: "POST",
      headers: {
        apikey: serviceRoleKey ?? "",
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify(rows),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Supabase settings save failed: ${response.status} ${response.statusText} ${await response.text()}`,
    );
  }

  return {
    saved: true,
    rowsSaved: rows.length,
  };
}

export async function loadSavedSignalRows(limit = 50) {
  if (!isSupabaseConfigured()) {
    return {
      source: "sample",
      rows: [],
      reason: "Supabase env vars are not configured.",
    };
  }

  const params = new URLSearchParams({
    select: "symbol,exchange,source_symbol,weekly_close,created_at",
    status: "eq.SIGNAL",
    weekly_close: "not.is.null",
    order: "created_at.desc",
    limit: String(limit),
  });
  const response = await fetch(
    `${supabaseUrl}/rest/v1/signal_results?${params}`,
    {
      headers: {
        apikey: serviceRoleKey ?? "",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Supabase signal history lookup failed: ${response.status} ${response.statusText} ${await response.text()}`,
    );
  }

  const rows = (await response.json()) as {
    symbol: string;
    exchange: string | null;
    source_symbol: string | null;
    weekly_close: number;
    created_at: string;
  }[];

  return {
    source: "supabase",
    rows,
  };
}

export async function loadSavedSignalResults({
  limit = 100,
  unique = false,
}: {
  limit?: number;
  unique?: boolean;
} = {}) {
  if (!isSupabaseConfigured()) {
    return {
      source: "unconfigured",
      rows: [],
      reason: "Supabase env vars are not configured.",
    };
  }

  const params = new URLSearchParams({
    select:
      "id,symbol,exchange,source_symbol,price,monthly_rsi,rsi_zone,weekly_close,previous_red_high,stars,status,reason,created_at,scan_id",
    order: "created_at.desc",
    limit: String(limit),
  });
  const table = unique ? "latest_signal_results" : "signal_results";

  if (!unique) {
    params.set("status", "in.(SIGNAL,WATCHLIST)");
  }

  const response = await fetch(
    `${supabaseUrl}/rest/v1/${table}?${params}`,
    {
      headers: {
        apikey: serviceRoleKey ?? "",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Supabase saved signal results lookup failed: ${response.status} ${response.statusText} ${await response.text()}`,
    );
  }

  return {
    source: "supabase",
    rows: (await response.json()) as SavedSignalResultRow[],
  };
}

export type SavedSignalResultRow = {
  id: string;
  symbol: string;
  exchange: string | null;
  source_symbol: string | null;
  price: number | null;
  monthly_rsi: number | null;
  rsi_zone: string | null;
  weekly_close: number | null;
  previous_red_high: number | null;
  stars: number;
  status: "SIGNAL" | "WATCHLIST";
  reason: string;
  created_at: string;
  scan_id: string | null;
};

export const loadSavedSignals = loadSavedSignalResults;

export async function loadScanLogs(limit = 25) {
  if (!isSupabaseConfigured()) {
    return {
      source: "unconfigured",
      logs: [],
      reason: "Supabase env vars are not configured.",
    };
  }

  const params = new URLSearchParams({
    select:
      "id,scan_type,universe,status,started_at,finished_at,coins_scanned,error_message",
    order: "started_at.desc",
    limit: String(limit),
  });
  const response = await fetch(`${supabaseUrl}/rest/v1/scans?${params}`, {
    headers: {
      apikey: serviceRoleKey ?? "",
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Supabase scan log lookup failed: ${response.status} ${response.statusText} ${await response.text()}`,
    );
  }

  return {
    source: "supabase",
    logs: (await response.json()) as ScanLogRow[],
  };
}

export async function loadLatestScanSummary() {
  if (!isSupabaseConfigured()) {
    return {
      source: "unconfigured",
      scan: null,
      results: [],
      reason: "Supabase env vars are not configured.",
    };
  }

  const scanParams = new URLSearchParams({
    select: "id,scan_type,universe,status,started_at,finished_at,coins_scanned,error_message",
    order: "started_at.desc",
    limit: "1",
  });
  const scanResponse = await fetch(`${supabaseUrl}/rest/v1/scans?${scanParams}`, {
    headers: {
      apikey: serviceRoleKey ?? "",
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });

  if (!scanResponse.ok) {
    throw new Error(
      `Supabase latest scan lookup failed: ${scanResponse.status} ${scanResponse.statusText} ${await scanResponse.text()}`,
    );
  }

  const scans = (await scanResponse.json()) as {
    id: string;
    scan_type: string;
    universe: string | null;
    status: string;
    started_at: string;
    finished_at: string | null;
    coins_scanned: number;
    error_message: string | null;
  }[];
  const scan = scans[0] ?? null;

  if (!scan) {
    return {
      source: "supabase",
      scan: null,
      results: [],
      reason: "No saved scans yet.",
    };
  }

  const resultParams = new URLSearchParams({
    select: "status,stars",
    scan_id: `eq.${scan.id}`,
  });
  const resultResponse = await fetch(
    `${supabaseUrl}/rest/v1/signal_results?${resultParams}`,
    {
      headers: {
        apikey: serviceRoleKey ?? "",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    },
  );

  if (!resultResponse.ok) {
    throw new Error(
      `Supabase latest scan results lookup failed: ${resultResponse.status} ${resultResponse.statusText} ${await resultResponse.text()}`,
    );
  }

  return {
    source: "supabase",
    scan,
    results: (await resultResponse.json()) as {
      status: string;
      stars: number;
    }[],
  };
}

export async function loadSignalHistory(symbol: string, limit = 10) {
  if (!isSupabaseConfigured()) {
    return {
      source: "unconfigured",
      rows: [],
      reason: "Supabase env vars are not configured.",
    };
  }

  const params = new URLSearchParams({
    select:
      "created_at,status,stars,monthly_rsi,weekly_close,previous_red_high,reason,exchange,source_symbol",
    symbol: `eq.${symbol}`,
    order: "created_at.desc",
    limit: String(limit),
  });
  const response = await fetch(
    `${supabaseUrl}/rest/v1/signal_results?${params}`,
    {
      headers: {
        apikey: serviceRoleKey ?? "",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Supabase signal history lookup failed: ${response.status} ${response.statusText} ${await response.text()}`,
    );
  }

  return {
    source: "supabase",
    rows: (await response.json()) as {
      created_at: string;
      status: string;
      stars: number;
      monthly_rsi: number | null;
      weekly_close: number | null;
      previous_red_high: number | null;
      reason: string;
      exchange: string | null;
      source_symbol: string | null;
    }[],
  };
}

export async function loadLatestSignalResultForSymbol(symbol: string) {
  if (!isSupabaseConfigured()) {
    return {
      source: "unconfigured",
      row: null,
      reason: "Supabase env vars are not configured.",
    };
  }

  const params = new URLSearchParams({
    select: "symbol,exchange,source_symbol,created_at",
    symbol: `eq.${symbol}`,
    order: "created_at.desc",
    limit: "1",
  });
  const response = await fetch(
    `${supabaseUrl}/rest/v1/signal_results?${params}`,
    {
      headers: {
        apikey: serviceRoleKey ?? "",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Supabase latest signal source lookup failed: ${response.status} ${response.statusText} ${await response.text()}`,
    );
  }

  const rows = (await response.json()) as {
    symbol: string;
    exchange: string | null;
    source_symbol: string | null;
    created_at: string;
  }[];

  return {
    source: "supabase",
    row: rows[0] ?? null,
  };
}

async function insertRows<T>(table: string, rows: unknown[]): Promise<T[]> {
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey ?? "",
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(rows),
  });

  if (!response.ok) {
    throw new Error(
      `Supabase insert failed for ${table}: ${response.status} ${response.statusText} ${await response.text()}`,
    );
  }

  return (await response.json()) as InsertResponse<T>;
}

async function upsertRows<T>(
  table: string,
  rows: unknown[],
  onConflict: string,
): Promise<T[]> {
  if (rows.length === 0) {
    return [];
  }

  const response = await fetch(
    `${supabaseUrl}/rest/v1/${table}?on_conflict=${onConflict}`,
    {
      method: "POST",
      headers: {
        apikey: serviceRoleKey ?? "",
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify(rows),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Supabase upsert failed for ${table}: ${response.status} ${response.statusText} ${await response.text()}`,
    );
  }

  return (await response.json()) as T[];
}

function getRsiZone(monthlyRsi: number | null) {
  if (monthlyRsi === null) {
    return "UNKNOWN";
  }

  if (monthlyRsi >= 38 && monthlyRsi <= 41) {
    return "PERFECT";
  }

  if (monthlyRsi > 41 && monthlyRsi <= 44) {
    return "GOOD";
  }

  if (monthlyRsi > 44 && monthlyRsi <= 47) {
    return "WATCHLIST";
  }

  if (monthlyRsi < 38) {
    return "OVERSOLD_RISKY";
  }

  return "IGNORE";
}

function getUtcWeekStart() {
  const now = new Date();
  const day = now.getUTCDay();
  const diffFromMonday = day === 0 ? 6 : day - 1;
  const weekStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  weekStart.setUTCDate(weekStart.getUTCDate() - diffFromMonday);
  return weekStart;
}
