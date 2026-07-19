import { DashboardCard } from "@/components/DashboardCard";
import { loadLatestScanSummary } from "@/lib/supabase";

export async function LatestSavedScan() {
  const latest = await loadLatestSavedScanSafely();
  const results = latest.results;
  const signals = results.filter((result) => result.status === "SIGNAL");
  const watchlist = results.filter((result) => result.status === "WATCHLIST");
  const highQuality = signals.filter((result) => result.stars >= 4);

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-white">Latest Saved Scan</h2>
        <p className="mt-1 text-sm text-slate-400">
          Snapshot from Supabase, shown before you run a new live scan.
        </p>
      </div>
      {latest.scan ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <DashboardCard
              label="Coins scanned"
              value={latest.scan.coins_scanned}
              hint={`Finished ${formatTime(latest.scan.finished_at ?? latest.scan.started_at)}`}
              tone="blue"
            />
            <DashboardCard
              label="Confirmed signals"
              value={signals.length}
              hint="Saved rows with SIGNAL status."
              tone="green"
            />
            <DashboardCard
              label="Watchlist coins"
              value={watchlist.length}
              hint="Saved rows with WATCHLIST status."
              tone="amber"
            />
            <DashboardCard
              label="High quality"
              value={highQuality.length}
              hint="Saved signals with 4 or 5 stars."
            />
          </div>
          {latest.scan.error_message ? (
            <div className="rounded-md border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
              {latest.scan.error_message}
            </div>
          ) : null}
        </>
      ) : (
        <div className="panel px-4 py-6 text-sm text-slate-400">
          {latest.reason ?? "No saved scans yet."}
        </div>
      )}
    </section>
  );
}

async function loadLatestSavedScanSafely() {
  try {
    return await loadLatestScanSummary();
  } catch (error) {
    return {
      source: "unavailable",
      scan: null,
      results: [],
      reason:
        error instanceof Error
          ? `Could not load Supabase scan summary: ${error.message}`
          : "Could not load Supabase scan summary.",
    };
  }
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
