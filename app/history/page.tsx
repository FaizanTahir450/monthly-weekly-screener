import Link from "next/link";
import { StarRating } from "@/components/StarRating";
import { StatusBadge } from "@/components/StatusBadge";
import { loadSavedSignalResults } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type HistoryPageProps = {
  searchParams?: Promise<{
    tier?: string | string[];
    mode?: string | string[];
  }>;
};

const historyModes = [
  { key: "latest", label: "Latest Unique" },
  { key: "history", label: "All History" },
] as const;

const resultTabs = [
  { key: "all", label: "All Saved" },
  { key: "perfect", label: "Perfect Signals" },
  { key: "signals", label: "Signals" },
  { key: "strong-watchlist", label: "Strong Watchlist" },
  { key: "watchlist", label: "Watchlist" },
] as const;

type HistoryMode = (typeof historyModes)[number]["key"];
type ResultTab = (typeof resultTabs)[number]["key"];

export default async function HistoryPage({ searchParams }: HistoryPageProps) {
  const params = await searchParams;
  const activeTab = parseResultTab(params?.tier);
  const activeMode = parseHistoryMode(params?.mode);
  const savedResults = await loadSavedResultsSafely(activeMode);
  const baseRows = savedResults.rows;
  const visibleRows = baseRows.filter((row) =>
    rowMatchesTab(row, activeTab),
  );
  const tabCounts = Object.fromEntries(
    resultTabs.map((tab) => [
      tab.key,
      baseRows.filter((row) => rowMatchesTab(row, tab.key)).length,
    ]),
  ) as Record<ResultTab, number>;

  return (
    <div className="space-y-6">
      <section>
        <h1 className="section-title">Saved Results</h1>
        <p className="section-copy">
          Latest unique saved rows by default, with full scan history available
          when you need the raw trail.
        </p>
      </section>

      <section className="panel overflow-hidden">
        <div className="flex flex-wrap gap-2 border-b border-line px-4 py-3">
          {historyModes.map((mode) => {
            const isActive = mode.key === activeMode;
            const href = buildHistoryHref({
              mode: mode.key,
              tier: activeTab,
            });

            return (
              <Link
                key={mode.key}
                href={href}
                className={`whitespace-nowrap rounded-md border px-3 py-2 text-xs font-medium transition ${
                  isActive
                    ? "border-sky-300 bg-sky-400 text-slate-950"
                    : "border-line bg-muted text-slate-300 hover:border-slate-500 hover:text-white"
                }`}
              >
                {mode.label}
              </Link>
            );
          })}
        </div>

        <div className="flex gap-2 overflow-x-auto border-b border-line px-4 py-3">
          {resultTabs.map((tab) => {
            const isActive = tab.key === activeTab;
            const href = buildHistoryHref({
              mode: activeMode,
              tier: tab.key,
            });

            return (
              <Link
                key={tab.key}
                href={href}
                className={`whitespace-nowrap rounded-md border px-3 py-2 text-xs font-medium transition ${
                  isActive
                    ? "border-emerald-400 bg-emerald-500 text-slate-950"
                    : "border-line bg-muted text-slate-300 hover:border-slate-500 hover:text-white"
                }`}
              >
                {tab.label} ({tabCounts[tab.key]})
              </Link>
            );
          })}
        </div>

        {savedResults.rows.length === 0 ? (
          <div className="px-4 py-6 text-sm text-slate-400">
            {savedResults.reason ?? "No saved signals or watchlist rows yet."}
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="px-4 py-6 text-sm text-slate-400">
            No saved rows in this tier yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1240px] text-left text-sm">
              <thead className="bg-muted text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Symbol</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Monthly RSI</th>
                  <th className="px-4 py-3 font-medium">RSI Zone</th>
                  <th className="px-4 py-3 font-medium">Weekly Close</th>
                  <th className="px-4 py-3 font-medium">Prev Red High</th>
                  <th className="px-4 py-3 font-medium">Breakout</th>
                  <th className="px-4 py-3 font-medium">Stars</th>
                  <th className="px-4 py-3 font-medium">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visibleRows.map((signal) => {
                  const breakout =
                    signal.weekly_close !== null &&
                    signal.previous_red_high !== null &&
                    signal.previous_red_high > 0
                      ? ((signal.weekly_close - signal.previous_red_high) /
                          signal.previous_red_high) *
                        100
                      : null;

                  return (
                    <tr key={signal.id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-slate-400">
                        {formatTime(signal.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/coins/${signal.symbol}`}
                          className="font-medium text-white hover:text-emerald-300"
                        >
                          {signal.symbol}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        <div>{signal.exchange ?? "BINANCE"}</div>
                        <div className="text-xs text-slate-500">
                          {signal.source_symbol ?? signal.symbol}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={signal.status} />
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {formatNumber(signal.price, 4)}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {formatNumber(signal.monthly_rsi, 1)}
                      </td>
                      <td className="px-4 py-3 text-emerald-300">
                        {signal.rsi_zone ?? "N/A"}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {formatNumber(signal.weekly_close, 4)}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {formatNumber(signal.previous_red_high, 4)}
                      </td>
                      <td className="px-4 py-3 text-emerald-300">
                        {breakout === null ? "N/A" : `${breakout.toFixed(2)}%`}
                      </td>
                      <td className="px-4 py-3">
                        <StarRating stars={signal.stars} />
                      </td>
                      <td className="max-w-md px-4 py-3 text-slate-400">
                        {signal.reason}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

type SavedResults = Awaited<ReturnType<typeof loadSavedSignalResults>>;
type SavedResultRow = SavedResults["rows"][number];

async function loadSavedResultsSafely(
  mode: HistoryMode,
): Promise<SavedResults> {
  try {
    return await loadSavedSignalResults({
      limit: 500,
      unique: mode === "latest",
    });
  } catch (error) {
    return {
      source: "unavailable",
      rows: [],
      reason:
        error instanceof Error
          ? `Could not load saved results: ${error.message}`
          : "Could not load saved results.",
    };
  }
}

function parseResultTab(value: string | string[] | undefined): ResultTab {
  const tab = Array.isArray(value) ? value[0] : value;

  return resultTabs.some((option) => option.key === tab)
    ? (tab as ResultTab)
    : "all";
}

function parseHistoryMode(value: string | string[] | undefined): HistoryMode {
  const mode = Array.isArray(value) ? value[0] : value;

  return historyModes.some((option) => option.key === mode)
    ? (mode as HistoryMode)
    : "latest";
}

function buildHistoryHref({
  mode,
  tier,
}: {
  mode: HistoryMode;
  tier: ResultTab;
}) {
  const params = new URLSearchParams();

  if (mode !== "latest") {
    params.set("mode", mode);
  }

  if (tier !== "all") {
    params.set("tier", tier);
  }

  const query = params.toString();
  return query ? `/history?${query}` : "/history";
}

function rowMatchesTab(row: SavedResultRow, tab: ResultTab) {
  switch (tab) {
    case "perfect":
      return row.status === "SIGNAL" && row.stars >= 5;
    case "signals":
      return row.status === "SIGNAL" && row.stars < 5;
    case "strong-watchlist":
      return row.status === "WATCHLIST" && row.stars >= 3;
    case "watchlist":
      return row.status === "WATCHLIST" && row.stars < 3;
    default:
      return true;
  }
}

function formatNumber(value: number | null, digits: number) {
  return value === null
    ? "N/A"
    : value.toLocaleString(undefined, {
        maximumFractionDigits: digits,
        minimumFractionDigits: Math.min(digits, 2),
      });
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
