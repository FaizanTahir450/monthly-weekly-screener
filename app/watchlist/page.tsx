import { LiveScanTable } from "@/components/LiveScanTable";

export default function WatchlistPage() {
  return (
    <div className="space-y-6">
      <section>
        <h1 className="section-title">Live Watchlist</h1>
        <p className="section-copy">
          Run a fresh scan and show coins near the value zone that still need
          weekly close confirmation or stronger conditions before becoming
          signals.
        </p>
      </section>
      <LiveScanTable
        status="WATCHLIST"
        title="Live Watchlist"
        description="Runs the selected live universe and shows only watchlist coins."
        emptyText="No live watchlist coins in this scan."
      />
    </div>
  );
}
