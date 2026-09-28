"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";
import type { MemberProspectEntry } from "@/types/database";

export interface TeamProspectsMemberRow {
  memberId: string;
  fullName: string;
  preferredName: string | null;
  totalProspects: number;
  totalOffice: number;
  daysLogged: number;
  entries: MemberProspectEntry[];
}

interface Props {
  rows: TeamProspectsMemberRow[];
  yearMonth: string;
}

export function TeamProspectsTable({ rows, yearMonth }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  const grandProspects = rows.reduce((s, r) => s + r.totalProspects, 0);
  const grandOffice = rows.reduce((s, r) => s + r.totalOffice, 0);
  const membersWithLogs = rows.filter((r) => r.daysLogged > 0).length;

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-10 text-center text-neutral-500">
        No active team members found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatChip label="Members logged" value={String(membersWithLogs)} />
        <StatChip label="Total prospects" value={String(grandProspects)} />
        <StatChip label="Office prospects" value={String(grandOffice)} />
        <StatChip label="Month" value={yearMonth} />
      </div>

      <div className="responsive-table bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-neutral-500 bg-neutral-50">
              <th className="p-3 font-medium w-8" />
              <th className="p-3 font-medium">Member</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium text-right">Days logged</th>
              <th className="p-3 font-medium text-right">Prospects</th>
              <th className="p-3 font-medium text-right">Office</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const open = openId === row.memberId;
              const hasLogs = row.daysLogged > 0;

              return (
                <Fragment key={row.memberId}>
                  <tr
                    className={cn(
                      "border-b hover:bg-neutral-50 cursor-pointer",
                      open && "bg-sky-50/60"
                    )}
                    onClick={() => hasLogs && setOpenId(open ? null : row.memberId)}
                  >
                    <td className="p-3 text-neutral-400">
                      {hasLogs ? (
                        open ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )
                      ) : null}
                    </td>
                    <td className="p-3">
                      <Link
                        href={`/team-members/${row.memberId}`}
                        className="font-medium text-brand-green hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {row.fullName}
                      </Link>
                      {row.preferredName ? (
                        <p className="text-xs text-neutral-400">“{row.preferredName}”</p>
                      ) : null}
                    </td>
                    <td className="p-3">
                      {hasLogs ? (
                        <Badge variant="success">Logged</Badge>
                      ) : (
                        <Badge variant="neutral">No entries</Badge>
                      )}
                    </td>
                    <td className="p-3 text-right tabular-nums">{row.daysLogged || "—"}</td>
                    <td className="p-3 text-right tabular-nums font-semibold">
                      {hasLogs ? row.totalProspects : "—"}
                    </td>
                    <td className="p-3 text-right tabular-nums">
                      {hasLogs ? row.totalOffice : "—"}
                    </td>
                  </tr>
                  {open && hasLogs && (
                    <tr className="border-b bg-neutral-50/80">
                      <td colSpan={6} className="p-0">
                        <div className="px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-2">
                            Daily log for {yearMonth}
                          </p>
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-neutral-500">
                                <th className="text-left py-1.5 font-medium">Date</th>
                                <th className="text-right py-1.5 font-medium">Prospects</th>
                                <th className="text-right py-1.5 font-medium">Office</th>
                                <th className="text-left py-1.5 font-medium pl-4">Notes</th>
                              </tr>
                            </thead>
                            <tbody>
                              {row.entries.map((e) => (
                                <tr key={e.id} className="border-t border-neutral-200/80">
                                  <td className="py-2">{formatDate(e.logged_date)}</td>
                                  <td className="py-2 text-right tabular-nums font-medium">
                                    {e.prospects_count}
                                  </td>
                                  <td className="py-2 text-right tabular-nums">
                                    {e.office_prospects_count}
                                  </td>
                                  <td className="py-2 pl-4 text-neutral-600 max-w-md truncate">
                                    {e.notes?.trim() || "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-100 bg-white px-4 py-3 shadow-sm">
      <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="text-xl font-bold text-neutral-900 mt-0.5 tabular-nums">{value}</p>
    </div>
  );
}
