import { runScanForUniverse } from "../lib/scanRouter.ts";

const universeArg = process.argv.find((arg) => arg.startsWith("--universe="));
const universe = universeArg?.split("=")[1] ?? "default";
const alerts = process.argv.includes("--alerts");

async function main() {
  const scan = await runScanForUniverse({
    universe,
    persist: true,
    alerts,
  });

  console.log(
    JSON.stringify(
      {
        scanType: scan.scanType,
        universe: scan.universe,
        coinsScanned: scan.coinsScanned,
        note: scan.note,
        startedAt: scan.startedAt,
        finishedAt: scan.finishedAt,
        persistence: scan.persistence,
        alerts: scan.alerts,
        signals: scan.results.filter(
          (result) => result.ok && result.data?.status === "SIGNAL",
        ).length,
        watchlist: scan.results.filter(
          (result) => result.ok && result.data?.status === "WATCHLIST",
        ).length,
        failures: scan.results.filter((result) => !result.ok).length,
        failureSample: scan.results
          .filter((result) => !result.ok)
          .slice(0, 10)
          .map((result) => ({
            symbol: result.coin,
            error: result.error,
          })),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
