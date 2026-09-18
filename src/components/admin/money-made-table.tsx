import Link from "next/link";
import { formatMoney, formatNgn } from "@/lib/money/earnings";
import type { MemberWeeklyEarning } from "@/types/database";

export interface MoneyMemberRow {
  memberId: string;
  fullName: string;
  preferredName: string | null;
  isYou: boolean;
  netNgn: number;
  grossUsdLike: number;
  fees: number;
  fiverrNet: number;
  outsideNgn: number;
  weeksWithMoney: number;
  entries: MemberWeeklyEarning[];
}

export function MoneyMadeTable({ rows }: { rows: MoneyMemberRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-200 bg-white p-10 text-center text-sm text-neutral-500">
        No team members found.
      </div>
    );
  }

  return (
    <div className="responsive-table bg-white rounded-xl border shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-neutral-500 bg-neutral-50">
            <th className="p-3 font-medium">Member</th>
            <th className="p-3 font-medium text-right">Net (₦)</th>
            <th className="p-3 font-medium text-right">Fiverr net</th>
            <th className="p-3 font-medium text-right">Fees removed</th>
            <th className="p-3 font-medium text-right">Outside (₦)</th>
            <th className="p-3 font-medium text-right">Weeks</th>
            <th className="p-3 font-medium">Breakdown</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.memberId} className="border-b hover:bg-neutral-50 align-top">
              <td className="p-3">
                <Link
                  href={`/team-members/${r.memberId}`}
                  className="font-medium text-neutral-900 hover:text-brand-green"
                >
                  {r.preferredName || r.fullName}
                </Link>
                {r.isYou && (
                  <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-brand-orange bg-brand-orange/10 px-1.5 py-0.5 rounded">
                    You
                  </span>
                )}
                {r.preferredName && (
                  <p className="text-xs text-neutral-400">{r.fullName}</p>
                )}
              </td>
              <td className="p-3 text-right font-semibold tabular-nums text-neutral-900">
                {formatNgn(r.netNgn)}
              </td>
              <td className="p-3 text-right tabular-nums text-neutral-700">
                {r.fiverrNet > 0 ? formatMoney(r.fiverrNet) : "—"}
              </td>
              <td className="p-3 text-right tabular-nums text-red-600">
                {r.fees > 0 ? `−${formatMoney(r.fees)}` : "—"}
              </td>
              <td className="p-3 text-right tabular-nums text-neutral-700">
                {r.outsideNgn > 0 ? formatNgn(r.outsideNgn) : "—"}
              </td>
              <td className="p-3 text-right tabular-nums">{r.weeksWithMoney}</td>
              <td className="p-3 text-xs text-neutral-500 max-w-[240px]">
                {r.entries.filter((e) => Number(e.amount) > 0).length === 0 ? (
                  <span className="text-neutral-400">No earnings logged</span>
                ) : (
                  <ul className="space-y-1">
                    {r.entries
                      .filter((e) => Number(e.amount) > 0)
                      .map((e) => (
                        <li key={e.id}>
                          W{e.week_number}: {formatMoney(Number(e.amount), e.currency)}
                          {e.amount_ngn != null ? ` (${formatNgn(Number(e.amount_ngn))})` : ""}
                          {e.payment_source === "outside" ? " · outside" : " · Fiverr"}
                          {Number(e.fee_amount) > 0
                            ? ` · −${formatMoney(Number(e.fee_amount), e.currency)} fee`
                            : ""}
                        </li>
                      ))}
                  </ul>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
