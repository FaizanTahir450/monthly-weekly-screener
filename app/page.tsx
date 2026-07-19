import { LatestSavedScan } from "@/components/LatestSavedScan";
import { ManualScanPanel } from "@/components/ManualScanPanel";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <section>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="section-title">Dashboard</h1>
            <p className="section-copy">
              Run a live Binance scan, review signals and watchlist coins, and
              optionally save results or send Telegram alerts.
            </p>
          </div>
        </div>
      </section>

      <LatestSavedScan />
      <ManualScanPanel />
    </div>
  );
}
