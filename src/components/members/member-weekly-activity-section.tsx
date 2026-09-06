import Link from "next/link";
import { ClipboardList, ChevronRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatYearMonthLabel } from "@/lib/utils/dates";
import { getWeeksInMonth } from "@/lib/members/week-utils";
import { hasWeekActivity } from "@/lib/members/progress-metrics";
import type { MemberWeeklyEarning } from "@/types/database";

interface MemberWeeklyActivitySectionProps {
  yearMonth: string;
  earnings: MemberWeeklyEarning[];
  href?: string;
}

export function MemberWeeklyActivitySection({
  yearMonth,
  earnings,
  href = "/my-monthly-plan",
}: MemberWeeklyActivitySectionProps) {
  const weeks = getWeeksInMonth(yearMonth);
  const monthEntries = earnings.filter(
    (e) => e.year_month === yearMonth && hasWeekActivity(e)
  );
  const byWeek = new Map(monthEntries.map((e) => [e.week_number, e]));
  const logged = monthEntries.length;
  const total = weeks.length;
  const pct = total > 0 ? Math.round((logged / total) * 100) : 0;

  return (
    <section className="rounded-2xl border border-brand-orange/20 bg-gradient-to-br from-orange-50 via-white to-brand-green-light/30 shadow-sm overflow-hidden">
      <div className="px-5 py-4 md:px-6 border-b border-orange-100/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-orange/15 shrink-0">
            <ClipboardList className="h-5 w-5 text-brand-orange" />
          </span>
          <div>
            <h2 className="font-semibold text-neutral-900">Weekly Activity</h2>
            <p className="text-sm text-neutral-500 mt-0.5">
              Log each week&apos;s work for{" "}
              <span className="font-medium text-neutral-700">
                {formatYearMonthLabel(yearMonth)}
              </span>
              . Your admin reviews these submissions.
            </p>
          </div>
        </div>
        <Link href={href}>
          <Button size="sm" className="shrink-0">
            {logged === 0 ? "Start this week" : "Update weekly log"}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </div>

      <div className="p-5 md:px-6 space-y-4">
        <div className="flex items-center justify-between gap-3 text-sm">
          <p className="text-neutral-600">
            <span className="font-bold text-neutral-900">{logged}</span> of{" "}
            <span className="font-bold text-neutral-900">{total}</span> weeks
            submitted
          </p>
          <p className="tabular-nums font-semibold text-brand-orange">{pct}%</p>
        </div>
        <div className="h-2 w-full rounded-full bg-neutral-200/80 overflow-hidden">
          <div
            className="h-full rounded-full bg-brand-orange transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {weeks.map((w) => {
            const done = byWeek.has(w.week);
            return (
              <div
                key={w.week}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-center",
                  done
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-dashed border-neutral-200 bg-white"
                )}
              >
                <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-400">
                  Week {w.week}
                </p>
                {done ? (
                  <p className="mt-1 inline-flex items-center justify-center gap-1 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Done
                  </p>
                ) : (
                  <p className="mt-1 text-xs font-medium text-neutral-400">Pending</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
