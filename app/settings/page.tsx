"use client";

import { useEffect, useMemo, useState } from "react";
import { SettingsToggle } from "@/components/SettingsToggle";
import { dummyCoins } from "@/lib/dummyData";
import { defaultSettings } from "@/lib/settings";
import { evaluateCoins } from "@/lib/strategy";
import type {
  AutomationSettings,
  StrategySettings,
  StrategySwitches,
  StrategyValues,
} from "@/lib/types";

type SettingsResponse = {
  settings: StrategySettings;
  source?: string;
  persistence?: string;
  saved?: boolean;
  reason?: string;
};

const switchRows: {
  key: keyof StrategySwitches;
  label: string;
  description: string;
}[] = [
  {
    key: "monthlyRsiFilter",
    label: "Monthly RSI filter",
    description: "Requires monthly RSI to sit in the value or watchlist zone.",
  },
  {
    key: "weeklyGreenCandleFilter",
    label: "Weekly green candle filter",
    description: "Requires the completed weekly close to be above weekly open.",
  },
  {
    key: "weeklyCloseBreakoutFilter",
    label: "Weekly close breakout filter",
    description: "Requires close above previous red weekly high, not wick break.",
  },
  {
    key: "volumeConfirmationFilter",
    label: "Volume confirmation filter",
    description: "Requires weekly volume to be above the 20-week average.",
  },
  {
    key: "topMarketCapFilter",
    label: "Top market cap filter",
    description: "Keeps the universe focused on higher-rank coins.",
  },
  {
    key: "minimumVolumeFilter",
    label: "Minimum volume filter",
    description: "Filters out illiquid coins using the minimum 24h volume value.",
  },
  {
    key: "stablecoinFilter",
    label: "Stablecoin filter",
    description: "Removes stablecoins and stable-like pairs from the screener.",
  },
  {
    key: "duplicateAlertFilter",
    label: "Duplicate alert filter",
    description: "Blocks repeated alerts for coins already alerted this week.",
  },
  {
    key: "btcTrendFilter",
    label: "BTC trend filter",
    description: "Optional market filter for later use when BTC trend matters.",
  },
  {
    key: "trendingCoinBoost",
    label: "Trending coin boost",
    description: "Optional star boost for coins marked as trending in dummy data.",
  },
];

const valueRows: {
  key: keyof StrategyValues;
  label: string;
  min?: number;
  step?: number;
}[] = [
  { key: "rsiLength", label: "RSI length", min: 2, step: 1 },
  { key: "perfectRsiMin", label: "Perfect RSI min", step: 0.1 },
  { key: "perfectRsiMax", label: "Perfect RSI max", step: 0.1 },
  { key: "signalRsiMin", label: "Signal RSI min", step: 0.1 },
  { key: "signalRsiMax", label: "Signal RSI max", step: 0.1 },
  { key: "watchlistRsiMin", label: "Watchlist RSI min", step: 0.1 },
  { key: "watchlistRsiMax", label: "Watchlist RSI max", step: 0.1 },
  { key: "minimum24hVolume", label: "Minimum 24h volume", min: 0, step: 1000000 },
  { key: "alertMinimumStars", label: "Alert minimum stars", min: 1, step: 1 },
  { key: "maxMarketCapRank", label: "Max market cap rank", min: 1, step: 1 },
];

const switchSections: {
  title: string;
  rows: typeof switchRows;
}[] = [
  {
    title: "RSI Settings",
    rows: switchRows.filter((row) => row.key === "monthlyRsiFilter"),
  },
  {
    title: "Weekly Confirmation",
    rows: switchRows.filter((row) =>
      ["weeklyGreenCandleFilter", "weeklyCloseBreakoutFilter"].includes(
        row.key,
      ),
    ),
  },
  {
    title: "Volume And Liquidity",
    rows: switchRows.filter((row) =>
      ["volumeConfirmationFilter", "minimumVolumeFilter"].includes(row.key),
    ),
  },
  {
    title: "Coin Universe Safety",
    rows: switchRows.filter((row) =>
      ["topMarketCapFilter", "stablecoinFilter"].includes(row.key),
    ),
  },
  {
    title: "Alert Settings",
    rows: switchRows.filter((row) => row.key === "duplicateAlertFilter"),
  },
  {
    title: "Experimental Filters",
    rows: switchRows.filter((row) =>
      ["btcTrendFilter", "trendingCoinBoost"].includes(row.key),
    ),
  },
];

const valueSections: {
  title: string;
  rows: typeof valueRows;
}[] = [
  {
    title: "RSI Values",
    rows: valueRows.filter((row) =>
      [
        "rsiLength",
        "perfectRsiMin",
        "perfectRsiMax",
        "signalRsiMin",
        "signalRsiMax",
        "watchlistRsiMin",
        "watchlistRsiMax",
      ].includes(row.key),
    ),
  },
  {
    title: "Volume Settings",
    rows: valueRows.filter((row) =>
      ["minimum24hVolume", "maxMarketCapRank"].includes(row.key),
    ),
  },
  {
    title: "Star Rating Settings",
    rows: valueRows.filter((row) => row.key === "alertMinimumStars"),
  },
];

const automationRows: {
  key: keyof Pick<
    AutomationSettings,
    "dailyScanEnabled" | "weeklyScanEnabled" | "persistScansDefault" | "telegramAlertsDefault"
  >;
  label: string;
  description: string;
}[] = [
  {
    key: "dailyScanEnabled",
    label: "Daily scan schedule",
    description: "Preference for daily watchlist refresh jobs.",
  },
  {
    key: "weeklyScanEnabled",
    label: "Weekly serious scan",
    description: "Preference for Monday post-close confirmation scans.",
  },
  {
    key: "persistScansDefault",
    label: "Save scans by default",
    description: "Use Supabase persistence as the default manual scan choice.",
  },
  {
    key: "telegramAlertsDefault",
    label: "Telegram alerts by default",
    description: "Use Telegram alert sending as the default manual scan choice.",
  },
];

const universeOptions: {
  value: AutomationSettings["defaultScanUniverse"];
  label: string;
}[] = [
  { value: "default", label: "Default 5" },
  { value: "top100", label: "Top 100 CG" },
  { value: "top200", label: "Top 200 CG" },
  { value: "top500", label: "Top 500 CG" },
  { value: "binance", label: "All Binance USDT" },
  { value: "bybit", label: "Bybit USDT" },
  { value: "okx", label: "OKX USDT" },
  { value: "kucoin", label: "KuCoin USDT" },
  { value: "gate", label: "Gate.io USDT" },
  { value: "mexc", label: "MEXC USDT" },
  { value: "bitget", label: "Bitget USDT" },
  { value: "multi", label: "Multi-Exchange USDT" },
  { value: "multi-all", label: "Multi-Exchange All Markets" },
  { value: "ai", label: "AI" },
  { value: "gaming", label: "Gaming" },
  { value: "rwa", label: "RWA" },
  { value: "meme", label: "Meme" },
  { value: "trending", label: "Trending" },
  { value: "recent", label: "Recently Listed" },
  { value: "events", label: "Events" },
  { value: "social", label: "Social Trends" },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<StrategySettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<"neutral" | "success" | "error">(
    "neutral",
  );

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      setIsLoading(true);
      setStatusTone("neutral");
      setStatusMessage("Loading settings...");

      try {
        const response = await fetch("/api/settings", {
          method: "GET",
        });

        if (!response.ok) {
          throw new Error(`Settings load failed with status ${response.status}`);
        }

        const data = (await response.json()) as SettingsResponse;

        if (!active) {
          return;
        }

        setSettings(data.settings);
        setStatusTone("success");
        setStatusMessage(data.persistence ?? "Settings loaded.");
      } catch (error) {
        if (!active) {
          return;
        }

        setStatusTone("error");
        setStatusMessage(
          error instanceof Error ? error.message : "Settings load failed.",
        );
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadSettings();

    return () => {
      active = false;
    };
  }, []);

  const preview = useMemo(
    () => evaluateCoins(dummyCoins, settings),
    [settings],
  );

  const signalCount = preview.filter((coin) => coin.status === "SIGNAL").length;
  const watchlistCount = preview.filter(
    (coin) => coin.status === "WATCHLIST",
  ).length;

  function updateSwitch(
    key: keyof StrategySwitches | keyof AutomationSettings,
    enabled: boolean,
  ) {
    setSettings((current) => ({ ...current, [key]: enabled }));
  }

  function updateValue(key: keyof StrategyValues, value: number) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function updateDefaultUniverse(
    value: AutomationSettings["defaultScanUniverse"],
  ) {
    setSettings((current) => ({ ...current, defaultScanUniverse: value }));
  }

  async function saveSettings() {
    setIsSaving(true);
    setStatusTone("neutral");
    setStatusMessage("Saving settings...");

    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error(`Settings save failed with status ${response.status}`);
      }

      const data = (await response.json()) as SettingsResponse;
      setStatusTone(data.saved === false ? "neutral" : "success");
      setStatusMessage(
        data.saved === false
          ? (data.reason ?? "Settings kept locally because persistence is not configured.")
          : "Settings saved.",
      );
    } catch (error) {
      setStatusTone("error");
      setStatusMessage(
        error instanceof Error ? error.message : "Settings save failed.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="section-title">Settings</h1>
          <p className="section-copy">
            Tune strategy conditions for the screener. Settings load from the
            API and save to Supabase when environment variables are configured.
          </p>
        </div>
        <div className="grid gap-3 sm:min-w-80">
          <button
            type="button"
            onClick={saveSettings}
            disabled={isLoading || isSaving}
            className="h-11 rounded-md bg-emerald-500 px-5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            {isSaving ? "Saving..." : "Save Settings"}
          </button>
          {statusMessage ? (
            <div
              className={`rounded-md border px-3 py-2 text-sm ${
                statusTone === "success"
                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                  : statusTone === "error"
                    ? "border-red-400/30 bg-red-400/10 text-red-200"
                    : "border-line bg-muted text-slate-300"
              }`}
            >
              {statusMessage}
            </div>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:min-w-80">
          <div className="rounded-lg border border-line bg-muted p-4">
            <div className="text-xs uppercase text-slate-500">Signals</div>
            <div className="mt-2 text-2xl font-semibold text-emerald-300">
              {signalCount}
            </div>
          </div>
          <div className="rounded-lg border border-line bg-muted p-4">
            <div className="text-xs uppercase text-slate-500">Watchlist</div>
            <div className="mt-2 text-2xl font-semibold text-amber-300">
              {watchlistCount}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="grid gap-6">
          {switchSections.map((section) => (
            <div key={section.title} className="panel p-5">
              <h2 className="text-lg font-semibold text-white">
                {section.title}
              </h2>
              <div className="mt-5 grid gap-3">
                {section.rows.map((row) => (
                  <SettingsToggle
                    key={row.key}
                    label={row.label}
                    description={row.description}
                    enabled={settings[row.key]}
                    onChange={(enabled) => updateSwitch(row.key, enabled)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-6">
          {valueSections.map((section) => (
            <div key={section.title} className="panel p-5">
              <h2 className="text-lg font-semibold text-white">
                {section.title}
              </h2>
              <div className="mt-5 grid gap-4">
                {section.rows.map((row) => (
                  <label
                    key={row.key}
                    className="grid gap-2 rounded-lg border border-line bg-muted/60 p-4"
                  >
                    <span className="text-sm font-medium text-white">
                      {row.label}
                    </span>
                    <input
                      type="number"
                      value={settings[row.key]}
                      min={row.min}
                      step={row.step}
                      onChange={(event) =>
                        updateValue(row.key, Number(event.target.value))
                      }
                      className="h-10 rounded-md border border-line bg-[#0b111a] px-3 text-sm text-white outline-none focus:border-emerald-400"
                    />
                  </label>
                ))}
              </div>
            </div>
          ))}

          <div className="panel p-5">
            <h2 className="text-lg font-semibold text-white">
              Automation Settings
            </h2>
            <div className="mt-5 grid gap-4">
              <label className="grid gap-2 rounded-lg border border-line bg-muted/60 p-4">
                <span className="text-sm font-medium text-white">
                  Default scan universe
                </span>
                <select
                  value={settings.defaultScanUniverse}
                  onChange={(event) =>
                    updateDefaultUniverse(
                      event.target
                        .value as AutomationSettings["defaultScanUniverse"],
                    )
                  }
                  className="h-10 rounded-md border border-line bg-[#0b111a] px-3 text-sm text-white outline-none focus:border-emerald-400"
                >
                  {universeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              {automationRows.map((row) => (
                <SettingsToggle
                  key={row.key}
                  label={row.label}
                  description={row.description}
                  enabled={settings[row.key]}
                  onChange={(enabled) => updateSwitch(row.key, enabled)}
                />
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
