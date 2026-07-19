import Link from "next/link";
import { StarRating } from "@/components/StarRating";
import { StatusBadge } from "@/components/StatusBadge";
import type { TableCoin } from "@/components/SignalTable";

type WatchlistTableProps = {
  coins: TableCoin[];
};

export function WatchlistTable({ coins }: WatchlistTableProps) {
  return (
    <div className="panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-left text-sm">
          <thead className="bg-muted text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Coin</th>
              <th className="px-4 py-3 font-medium">Monthly RSI</th>
              <th className="px-4 py-3 font-medium">RSI Zone</th>
              <th className="px-4 py-3 font-medium">Weekly Close</th>
              <th className="px-4 py-3 font-medium">Breakout Needed</th>
              <th className="px-4 py-3 font-medium">Distance</th>
              <th className="px-4 py-3 font-medium">Stars</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {coins.map((coin) => {
              const distance =
                coin.previousRedWeeklyHigh === null
                  ? null
                  : ((coin.previousRedWeeklyHigh - coin.weeklyClose) /
                      coin.weeklyClose) *
                    100;

              return (
                <tr key={coin.symbol} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-4">
                    <Link
                      href={`/coins/${coin.symbol}`}
                      className="font-medium text-white hover:text-emerald-300"
                    >
                      {coin.name}
                    </Link>
                    <div className="text-xs text-slate-500">{coin.symbol}</div>
                  </td>
                  <td className="px-4 py-4 text-slate-300">
                    {coin.monthlyRsi?.toFixed(1) ?? "N/A"}
                  </td>
                  <td className="px-4 py-4 text-amber-300">
                    {coin.monthlyRsi === null
                      ? "Unknown"
                      : coin.monthlyRsi <= 44
                        ? "Signal setup"
                        : "Watch zone"}
                  </td>
                  <td className="px-4 py-4 text-slate-300">
                    {coin.weeklyClose.toFixed(2)}
                  </td>
                  <td className="px-4 py-4 text-slate-300">
                    {coin.previousRedWeeklyHigh?.toFixed(2) ?? "N/A"}
                  </td>
                  <td className="px-4 py-4 text-slate-300">
                    {distance === null
                      ? "N/A"
                      : distance > 0
                      ? `${distance.toFixed(2)}%`
                      : "Close break done"}
                  </td>
                  <td className="px-4 py-4">
                    <StarRating stars={coin.stars} />
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={coin.status} />
                  </td>
                  <td className="max-w-md px-4 py-4 text-slate-400">
                    {coin.reason}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
