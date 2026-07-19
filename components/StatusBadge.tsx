import type { SignalStatus } from "@/lib/types";

const statusClasses: Record<SignalStatus, string> = {
  SIGNAL: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  WATCHLIST: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  IGNORED: "border-slate-500/30 bg-slate-500/10 text-slate-300",
};

export function StatusBadge({ status }: { status: SignalStatus }) {
  return (
    <span
      className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${statusClasses[status]}`}
    >
      {status}
    </span>
  );
}
