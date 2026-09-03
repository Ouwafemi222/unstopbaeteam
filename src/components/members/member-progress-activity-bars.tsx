import { Activity, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatYearMonthLabel } from "@/lib/utils/dates";
import type { MemberProgressMetrics } from "@/lib/members/progress-metrics";

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function ProgressTrack({
  value,
  tone = "green",
  className,
}: {
  value: number;
  tone?: "green" | "orange" | "violet";
  className?: string;
}) {
  const fill =
    tone === "orange"
      ? "bg-brand-orange"
      : tone === "violet"
        ? "bg-violet-500"
        : "bg-brand-green";

  return (
    <div className={cn("h-2.5 w-full rounded-full bg-neutral-200/80 overflow-hidden", className)}>
      <div
        className={cn("h-full rounded-full transition-all duration-700 ease-out", fill)}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

function MiniMetric({
  label,
  actual,
  target,
  pct,
}: {
  label: string;
  actual: string;
  target: string | null;
  pct: number | null;
}) {
  if (pct == null && !target) return null;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-neutral-500 font-medium">{label}</span>
        <span className="tabular-nums text-neutral-700">
          {actual}
          {target ? <span className="text-neutral-400"> / {target}</span> : null}
          {pct != null ? (
            <span className="ml-1.5 font-semibold text-brand-green">{pct}%</span>
          ) : null}
        </span>
      </div>
      {pct != null && <ProgressTrack value={pct} className="h-1.5" />}
    </div>
  );
}

interface MemberProgressActivityBarsProps {
  metrics: MemberProgressMetrics;
  className?: string;
  compact?: boolean;
}

export function MemberProgressActivityBars({
  metrics,
  className,
  compact,
}: MemberProgressActivityBarsProps) {
  const monthLabel = formatYearMonthLabel(metrics.yearMonth);

  return (
    <div
      className={cn(
        "rounded-2xl border border-neutral-100 bg-white shadow-sm overflow-hidden",
        className
      )}
    >
      <div className="px-5 pt-5 pb-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
          {monthLabel} · Goals & activity
        </p>
      </div>

      <div className={cn("grid gap-5 p-5 pt-3", compact ? "md:grid-cols-1" : "md:grid-cols-2")}>
        {/* Progress */}
        <div className="rounded-xl bg-gradient-to-br from-brand-green-light/40 to-white border border-brand-green/10 p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-green/15">
                <Target className="h-4 w-4 text-brand-green" />
              </span>
              <div>
                <p className="text-sm font-semibold text-neutral-900">Progress</p>
                <p className="text-xs text-neutral-500">Toward monthly goals</p>
              </div>
            </div>
            <p className="text-2xl font-extrabold tabular-nums text-brand-green">
              {metrics.overallProgressPct}%
            </p>
          </div>
          <ProgressTrack value={metrics.overallProgressPct} />
          <div className="space-y-2.5 pt-1">
            <MiniMetric
              label="Income"
              actual={formatMoney(metrics.incomeActual)}
              target={
                metrics.incomeGoal != null && metrics.incomeGoal > 0
                  ? formatMoney(metrics.incomeGoal)
                  : null
              }
              pct={metrics.incomePct}
            />
            <MiniMetric
              label="Prospects"
              actual={String(metrics.prospectsActual)}
              target={
                metrics.prospectsGoal != null && metrics.prospectsGoal > 0
                  ? String(metrics.prospectsGoal)
                  : null
              }
              pct={metrics.prospectsPct}
            />
            <MiniMetric
              label="Contacts"
              actual={String(metrics.contactsActual)}
              target={
                metrics.contactsGoal != null && metrics.contactsGoal > 0
                  ? String(metrics.contactsGoal)
                  : null
              }
              pct={metrics.contactsPct}
            />
            {metrics.incomePct == null &&
              metrics.prospectsPct == null &&
              metrics.contactsPct == null && (
                <p className="text-xs text-neutral-400">
                  Set a monthly plan to track goal progress. Activity logging still fills the
                  bar above.
                </p>
              )}
          </div>
        </div>

        {/* Activity */}
        <div className="rounded-xl bg-gradient-to-br from-orange-50 to-white border border-brand-orange/10 p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-orange/15">
                <Activity className="h-4 w-4 text-brand-orange" />
              </span>
              <div>
                <p className="text-sm font-semibold text-neutral-900">Activity</p>
                <p className="text-xs text-neutral-500">Weeks logged this month</p>
              </div>
            </div>
            <p className="text-2xl font-extrabold tabular-nums text-brand-orange">
              {metrics.activityPct}%
            </p>
          </div>
          <ProgressTrack value={metrics.activityPct} tone="orange" />
          <div className="flex items-center justify-between text-xs text-neutral-600">
            <span>
              <span className="font-semibold text-neutral-900">{metrics.weeksLogged}</span> of{" "}
              <span className="font-semibold text-neutral-900">{metrics.weeksElapsed}</span> weeks
              so far
            </span>
            <span className="text-neutral-400">{metrics.weeksTotal} weeks total</span>
          </div>

          <div className="space-y-1.5 pt-1 border-t border-orange-100/80">
            <div className="flex items-center justify-between gap-2 text-xs pt-2">
              <span className="text-neutral-500 font-medium">Message pace</span>
              <span className="tabular-nums text-neutral-700">
                {metrics.messagesThisMonth}
                <span className="text-neutral-400"> vs {metrics.messagesLastMonth} last mo</span>
                <span className="ml-1.5 font-semibold text-brand-orange">
                  {metrics.messageMomentumPct}%
                </span>
              </span>
            </div>
            <ProgressTrack value={metrics.messageMomentumPct} tone="orange" className="h-1.5" />
          </div>
        </div>
      </div>
    </div>
  );
}
