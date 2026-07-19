import { loadScanLogs } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function ScansPage() {
  const scanLogs = await loadScanLogsSafely();

  return (
    <div className="space-y-6">
      <section>
        <h1 className="section-title">Scan Logs</h1>
        <p className="section-copy">
          Saved Supabase scan-run logs, including status, timing, scanned coins,
          and captured errors.
        </p>
      </section>

      <section className="panel overflow-hidden">
        {scanLogs.logs.length === 0 ? (
          <div className="px-4 py-6 text-sm text-slate-400">
            {scanLogs.reason ?? "No saved scan logs yet."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="bg-muted text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Started</th>
                  <th className="px-4 py-3 font-medium">Finished</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Universe</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Coins</th>
                  <th className="px-4 py-3 font-medium">Errors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {scanLogs.logs.map((scan) => (
                  <tr key={scan.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-slate-300">
                      {formatTime(scan.started_at)}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {scan.finished_at ? formatTime(scan.finished_at) : "N/A"}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {scan.scan_type}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {scan.universe ?? "N/A"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          scan.status === "SUCCESS"
                            ? "text-emerald-300"
                            : "text-amber-300"
                        }
                      >
                        {scan.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {scan.coins_scanned}
                    </td>
                    <td className="max-w-md px-4 py-3 text-slate-400">
                      {scan.error_message || "None"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

async function loadScanLogsSafely() {
  try {
    return await loadScanLogs(50);
  } catch (error) {
    return {
      source: "unavailable",
      logs: [],
      reason:
        error instanceof Error
          ? `Could not load Supabase scan logs: ${error.message}`
          : "Could not load Supabase scan logs.",
    };
  }
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
