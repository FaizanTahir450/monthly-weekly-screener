import { NextResponse } from "next/server";
import { loadSavedSignalResults } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const saved = await loadSavedSignalResults({
      limit: 500,
      unique: true,
    });
    const watchlist = saved.rows.filter(
      (result) => result.status === "WATCHLIST",
    );

    return NextResponse.json({
      resultType: "WATCHLIST",
      results: watchlist,
      source: saved.source,
      reason: saved.reason,
      count: watchlist.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Saved watchlist lookup failed.",
      },
      { status: 502 },
    );
  }
}
