import { NextResponse } from "next/server";
import { loadScanLogs } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const limitParam = new URL(request.url).searchParams.get("limit");
  const limit = Math.min(Math.max(Number(limitParam) || 25, 1), 100);
  const logs = await loadScanLogs(limit);

  return NextResponse.json({
    ...logs,
    limit,
  });
}
