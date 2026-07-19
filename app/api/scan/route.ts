import { NextResponse } from "next/server";
import { defaultScanCoins } from "@/lib/scanner";
import { runScanForUniverse, scanUniverses } from "@/lib/scanRouter";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const universe = url.searchParams.get("universe");
  const persist = url.searchParams.get("persist") === "true";
  const alerts = url.searchParams.get("alerts") === "true";

  try {
    return NextResponse.json(
      await runScanForUniverse({ universe, persist, alerts }),
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Scan failed.",
      },
      { status: 502 },
    );
  }
}

export function GET() {
  return NextResponse.json({
    message: "Use POST /api/scan to run a manual scan.",
    universes: scanUniverses,
    symbols: defaultScanCoins.map((coin) => coin.symbol),
  });
}
