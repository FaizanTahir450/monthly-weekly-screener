import Link from "next/link";
import { StarRating } from "@/components/StarRating";
import { StatusBadge } from "@/components/StatusBadge";
import type { ExchangeId } from "@/lib/exchanges";
import type { EvaluatedCoin } from "@/lib/types";

export type TableCoin = Pick<
  EvaluatedCoin,
  | "name"
  | "symbol"
  | "price"
  | "weeklyClose"
  | "weeklyVolume"
  | "stars"
  | "status"
  | "reason"
  | "checks"
> & {
  exchange?: ExchangeId;
  sourceSymbol?: string;
  monthlyRsi: number | null;
  previousRedWeeklyHigh: number | null;
};

type SignalTableProps = {
  coins: TableCoin[];
};

export function SignalTable({ coins }: SignalTableProps) {
  return (
    <div className="panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-left text-sm">
          <thead className="bg-muted text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Coin</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Monthly RSI</th>
              <th className="px-4 py-3 font-medium">Weekly Close</th>
              <th className="px-4 py-3 font-medium">Prev Red High</th>
              <th className="px-4 py-3 font-medium">Breakout</th>
              <th className="px-4 py-3 font-medium">Volume</th>
              <th className="px-4 py-3 font-medium">Stars</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {coins.map((coin) => {
              const breakout =
                coin.previousRedWeeklyHigh && coin.previousRedWeeklyHigh > 0
                  ? ((coin.weeklyClose - coin.previousRedWeeklyHigh) /
                      coin.previousRedWeeklyHigh) *
                    100
                  : null;

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
                    ${coin.price.toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-slate-300">
                    {coin.monthlyRsi?.toFixed(1) ?? "N/A"}
                  </td>
                  <td className="px-4 py-4 text-slate-300">
                    {coin.weeklyClose.toFixed(2)}
                  </td>
                  <td className="px-4 py-4 text-slate-300">
                    {coin.previousRedWeeklyHigh?.toFixed(2) ?? "N/A"}
                  </td>
                  <td className="px-4 py-4 text-emerald-300">
                    {breakout === null ? "N/A" : `${breakout.toFixed(2)}%`}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={
                        coin.checks.volume
                          ? "text-emerald-300"
                          : "text-amber-300"
                      }
                    >
                      {coin.checks.volume ? "Strong" : "Weak"}
                    </span>
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
