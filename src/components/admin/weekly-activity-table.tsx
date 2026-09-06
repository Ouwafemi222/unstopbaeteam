"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { MemberWeeklyEarning } from "@/types/database";

function formatMoney(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export interface WeeklyActivityMemberRow {
  memberId: string;
  fullName: string;
  preferredName: string | null;
  weeksLogged: number;
  weeksTotal: number;
  income: number;
  prospects: number;
  officeProspects: number;
  contacts: number;
  personalPv: number;
  groupPv: number;
  entries: MemberWeeklyEarning[];
}

interface Props {
  rows: WeeklyActivityMemberRow[];
  weekNumbers: number[];
}

export function WeeklyActivityTable({ rows, weekNumbers }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-10 text-center text-neutral-500">
        No active team members found.
      </div>
    );
  }

  return (
    <div className="responsive-table bg-white rounded-xl border border-neutral-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-neutral-500 bg-neutral-50">
            <th className="p-3 font-medium w-8" />
            <th className="p-3 font-medium">Member</th>
            <th className="p-3 font-medium">Status</th>
            {weekNumbers.map((w) => (
              <th key={w} className="p-3 font-medium text-center">
                W{w}
              </th>
            ))}
            <th className="p-3 font-medium text-right">Income</th>
            <th className="p-3 font-medium text-right">Prospects</th>
            <th className="p-3 font-medium text-right">Contacts</th>
            <th className="p-3 font-medium text-right">PV</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const open = openId === row.memberId;
            const byWeek = new Map(row.entries.map((e) => [e.week_number, e]));
            const complete = row.weeksLogged > 0 && row.weeksLogged >= row.weeksTotal;
            const partial = row.weeksLogged > 0 && !complete;

            return (
              <FragmentRow key={row.memberId}>
                <tr
                  className={cn(
                    "border-b hover:bg-neutral-50 cursor-pointer",
                    open && "bg-brand-green-light/20"
                  )}
                  onClick={() => setOpenId(open ? null : row.memberId)}
                >
                  <td className="p-3 text-neutral-400">
                    {open ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </td>
                  <td className="p-3">
                    <Link
                      href={`/team-members/${row.memberId}`}
                      className="font-medium text-brand-green hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {row.fullName}
                    </Link>
                    {row.preferredName && (
                      <p className="text-xs text-neutral-400">{row.preferredName}</p>
                    )}
                  </td>
                  <td className="p-3">
                    {complete ? (
                      <Badge variant="success">
                        {row.weeksLogged}/{row.weeksTotal} weeks
                      </Badge>
                    ) : partial ? (
                      <Badge variant="warning">
                        {row.weeksLogged}/{row.weeksTotal} weeks
                      </Badge>
                    ) : (
                      <Badge variant="neutral">No submission</Badge>
                    )}
                  </td>
                  {weekNumbers.map((w) => {
                    const entry = byWeek.get(w);
                    const filled = !!entry;
                    return (
                      <td key={w} className="p-3 text-center">
                        <span
                          className={cn(
                            "inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold",
                            filled
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-neutral-100 text-neutral-400"
                          )}
                          title={filled ? `Week ${w} submitted` : `Week ${w} missing`}
                        >
                          {filled ? "✓" : "–"}
                        </span>
                      </td>
                    );
                  })}
                  <td className="p-3 text-right tabular-nums font-medium">
                    {row.income > 0 ? formatMoney(row.income) : "—"}
                  </td>
                  <td className="p-3 text-right tabular-nums">{row.prospects || "—"}</td>
                  <td className="p-3 text-right tabular-nums">{row.contacts || "—"}</td>
                  <td className="p-3 text-right tabular-nums">
                    {row.personalPv || row.groupPv
                      ? `${row.personalPv}/${row.groupPv}`
                      : "—"}
                  </td>
                </tr>
                {open && (
                  <tr className="border-b bg-neutral-50/80">
                    <td colSpan={7 + weekNumbers.length} className="p-0">
                      <div className="px-5 py-4 space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                          Week-by-week submission detail
                        </p>
                        {weekNumbers.map((w) => {
                          const e = byWeek.get(w);
                          if (!e) {
                            return (
                              <div
                                key={w}
                                className="rounded-lg border border-dashed border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-400"
                              >
                                Week {w} — not submitted
                              </div>
                            );
                          }
                          return (
                            <div
                              key={w}
                              className="rounded-lg border border-neutral-200 bg-white px-4 py-3 space-y-2"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="font-semibold text-neutral-900">Week {w}</p>
                                <p className="text-xs text-neutral-400">
                                  Updated{" "}
                                  {new Date(e.updated_at ?? e.created_at).toLocaleString()}
                                </p>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
                                <Stat label="Income" value={formatMoney(Number(e.amount), e.currency)} />
                                <Stat label="Prospects" value={String(e.prospects_count ?? 0)} />
                                <Stat
                                  label="Office"
                                  value={String(e.office_prospects_count ?? 0)}
                                />
                                <Stat label="Contacts" value={String(e.contacts_count ?? 0)} />
                                <Stat label="Personal PV" value={String(e.personal_pv ?? 0)} />
                                <Stat label="Group PV" value={String(e.group_pv ?? 0)} />
                              </div>
                              {(e.activities_done || e.skills_progress || e.notes) && (
                                <div className="grid sm:grid-cols-2 gap-3 pt-1">
                                  {e.activities_done && (
                                    <NoteBlock title="Activities done" text={e.activities_done} />
                                  )}
                                  {e.skills_progress && (
                                    <NoteBlock title="Skills progress" text={e.skills_progress} />
                                  )}
                                  {e.notes && <NoteBlock title="Notes" text={e.notes} />}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                )}
              </FragmentRow>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FragmentRow({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-neutral-50 border border-neutral-100 px-2.5 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-neutral-400">{label}</p>
      <p className="font-semibold text-neutral-800 tabular-nums">{value}</p>
    </div>
  );
}

function NoteBlock({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-neutral-400 mb-0.5">{title}</p>
      <p className="text-sm text-neutral-700 whitespace-pre-wrap">{text}</p>
    </div>
  );
}
