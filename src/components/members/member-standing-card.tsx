import { Briefcase, MessageSquare, Trophy, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MemberTeamStanding, StandingMetric } from "@/lib/members/member-standing";

interface MemberStandingCardProps {
  standing: MemberTeamStanding;
}

function ScaleBar({ pct, tone }: { pct: number; tone: "green" | "orange" | "violet" }) {
  const fill =
    tone === "orange"
      ? "bg-brand-orange"
      : tone === "violet"
        ? "bg-violet-500"
        : "bg-brand-green";
  return (
    <div className="h-2.5 w-full rounded-full bg-neutral-200/80 overflow-hidden">
      <div
        className={cn("h-full rounded-full transition-all duration-700 ease-out", fill)}
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </div>
  );
}

function MetricBlock({
  icon,
  label,
  metric,
  teamSize,
  tone,
  unit,
}: {
  icon: React.ReactNode;
  label: string;
  metric: StandingMetric;
  teamSize: number;
  tone: "green" | "orange";
  unit: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-100 bg-white p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-lg",
              tone === "green" ? "bg-brand-green/10 text-brand-green" : "bg-brand-orange/10 text-brand-orange"
            )}
          >
            {icon}
          </span>
          <div>
            <p className="text-sm font-semibold text-neutral-900">{label}</p>
            <p className="text-xs text-neutral-400">
              Your place · no other names shown
            </p>
          </div>
        </div>
        <p
          className={cn(
            "text-2xl font-extrabold tabular-nums",
            tone === "green" ? "text-brand-green" : "text-brand-orange"
          )}
        >
          {metric.scorePct}%
        </p>
      </div>

      <ScaleBar pct={metric.scorePct} tone={tone} />

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-600">
        <span>
          You have <span className="font-semibold text-neutral-900">{metric.mine}</span> {unit}
        </span>
        <span className="font-medium text-neutral-800">
          #{metric.rank}
          {teamSize > 0 ? ` of ${teamSize}` : ""}
        </span>
      </div>
    </div>
  );
}

export function MemberStandingCard({ standing }: MemberStandingCardProps) {
  if (!standing.ok) return null;

  const pulses: string[] = [];
  if (standing.messages.newThisWeek > 0) {
    pulses.push(
      standing.messages.newThisWeek === 1
        ? "You got a new message this week"
        : `You got ${standing.messages.newThisWeek} new messages this week`
    );
  }
  if (standing.accounts.newThisWeek > 0) {
    pulses.push(
      standing.accounts.newThisWeek === 1
        ? "You opened a new account this week"
        : `You opened ${standing.accounts.newThisWeek} new accounts this week`
    );
  }

  return (
    <section className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/70 via-white to-brand-green-light/30 shadow-sm overflow-hidden">
      <div className="px-5 py-4 md:px-6 border-b border-violet-100/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 shrink-0">
            <Trophy className="h-5 w-5 text-violet-600" />
          </span>
          <div>
            <h2 className="font-semibold text-neutral-900">Your team standing</h2>
            <p className="text-sm text-neutral-500 mt-0.5">
              How you compare this month — scored out of 100% vs the top performer.
              Other members&apos; names stay private.
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
            Overall
          </p>
          <p className="text-3xl font-extrabold tabular-nums text-violet-600">
            {standing.overallScorePct}%
          </p>
        </div>
      </div>

      <div className="p-5 md:p-6 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>Overall performance scale</span>
            <span className="font-semibold text-violet-600">{standing.overallScorePct}% / 100%</span>
          </div>
          <ScaleBar pct={standing.overallScorePct} tone="violet" />
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <MetricBlock
            icon={<MessageSquare className="h-4 w-4" />}
            label="Messages"
            metric={standing.messages}
            teamSize={standing.teamSize}
            tone="orange"
            unit="messages this month"
          />
          <MetricBlock
            icon={<Briefcase className="h-4 w-4" />}
            label="Accounts"
            metric={standing.accounts}
            teamSize={standing.teamSize}
            tone="green"
            unit="accounts"
          />
        </div>

        {pulses.length > 0 && (
          <div className="rounded-xl border border-brand-green/20 bg-brand-green-light/40 px-4 py-3 space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-green-dark flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Your activity updates
            </p>
            {pulses.map((text) => (
              <p key={text} className="text-sm text-neutral-700">
                {text}
              </p>
            ))}
            <p className="text-[11px] text-neutral-400 pt-0.5">
              Counts only — message content is never shown here.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
