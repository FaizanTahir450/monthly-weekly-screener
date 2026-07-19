import { NextResponse } from "next/server";
import { loadSavedSignalResults } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const saved = await loadSavedSignalResults({
      limit: 500,
      unique: true,
    });
    const signals = saved.rows.filter((result) => result.status === "SIGNAL");

    return NextResponse.json({
      resultType: "SIGNALS",
      results: signals,
      source: saved.source,
      reason: saved.reason,
      count: signals.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Saved signals lookup failed.",
      },
      { status: 502 },
    );
  }
}
