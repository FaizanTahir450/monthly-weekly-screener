import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

loadLocalEnv();

const universeArg = process.argv.find((arg) => arg.startsWith("--universe="));
const universe = universeArg?.split("=")[1] ?? "default";
const alerts = process.argv.includes("--alerts");

async function main() {
  const { runScanForUniverse } = await import("../lib/scanRouter.ts");
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

function loadLocalEnv() {
  const envPath = resolve(process.cwd(), ".env.local");

  if (!existsSync(envPath)) {
    return;
  }

  const envFile = readFileSync(envPath, "utf8");

  for (const line of envFile.split(/\r?\n/)) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const value = trimmedLine.slice(separatorIndex + 1).trim();
    process.env[key] ??= stripQuotes(value);
  }
}

function stripQuotes(value: string) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}
