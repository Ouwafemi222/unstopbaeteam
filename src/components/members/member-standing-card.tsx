"use client";

import { useEffect, useMemo, useState } from "react";
import { Briefcase, MessageSquare, Trophy, Sparkles, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MemberTeamStanding, StandingMetric } from "@/lib/members/member-standing";

interface MemberStandingCardProps {
  standing: MemberTeamStanding;
}

const SLIDE_MS = 5000;
const EXIT_MS = 450;

type Phase = "enter" | "hold" | "exit";

function ScaleBar({ pct, tone }: { pct: number; tone: "green" | "orange" | "violet" | "sky" }) {
  const fill =
    tone === "orange"
      ? "bg-brand-orange"
      : tone === "violet"
        ? "bg-violet-500"
        : tone === "sky"
          ? "bg-sky-500"
          : "bg-brand-green";
  return (
    <div className="h-1.5 w-full rounded-full bg-neutral-200/80 overflow-hidden">
      <div
        className={cn("h-full rounded-full transition-all duration-700 ease-out", fill)}
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </div>
  );
}

function LeaderBoard({
  title,
  icon,
  metric,
  teamSize,
  unit,
  tone,
}: {
  title: string;
  icon: React.ReactNode;
  metric: StandingMetric;
  teamSize: number;
  unit: string;
  tone: "green" | "orange" | "sky";
}) {
  const toneText =
    tone === "orange" ? "text-brand-orange" : tone === "sky" ? "text-sky-600" : "text-brand-green";
  const toneBg =
    tone === "orange"
      ? "bg-brand-orange/10 text-brand-orange"
      : tone === "sky"
        ? "bg-sky-100 text-sky-600"
        : "bg-brand-green/10 text-brand-green";

  return (
    <div className="rounded-xl border border-neutral-100 bg-white p-4 space-y-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn("inline-flex h-8 w-8 items-center justify-center rounded-lg shrink-0", toneBg)}>
            {icon}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-neutral-900">{title}</p>
            <p className="text-xs text-neutral-400 truncate">
              You&apos;re #{metric.rank}
              {teamSize > 0 ? ` of ${teamSize}` : ""} · {metric.mine} {unit}
            </p>
          </div>
        </div>
        <p className={cn("text-xl font-extrabold tabular-nums shrink-0", toneText)}>
          {metric.scorePct}%
        </p>
      </div>

      <ScaleBar pct={metric.scorePct} tone={tone} />

      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
          Top members
        </p>
        {metric.leaders.length === 0 ? (
          <p className="text-xs text-neutral-400 py-2">No activity logged yet this month.</p>
        ) : (
          <ul className="space-y-2">
            {metric.leaders.map((leader) => (
              <li
                key={`${title}-${leader.memberId}`}
                className={cn(
                  "rounded-lg border px-3 py-2",
                  leader.isMe
                    ? "border-brand-green/30 bg-brand-green-light/40"
                    : "border-neutral-100 bg-neutral-50/80"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={cn(
                      "inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold shrink-0",
                      leader.rank === 1
                        ? "bg-amber-100 text-amber-700"
                        : "bg-white text-neutral-500 border border-neutral-200"
                    )}
                  >
                    {leader.rank}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-neutral-900 truncate">
                      {leader.fullName}
                      {leader.isMe ? (
                        <span className="ml-1 text-[10px] font-bold uppercase text-brand-green">
                          you
                        </span>
                      ) : null}
                    </p>
                    <p className="text-[11px] text-neutral-400">
                      {leader.count} {unit} · {leader.scorePct}% of top
                    </p>
                  </div>
                </div>
                <div className="mt-1.5">
                  <ScaleBar pct={leader.scorePct} tone={tone} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export function MemberStandingCard({ standing }: MemberStandingCardProps) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("enter");

  const pulses = useMemo(() => {
    const list: string[] = [];
    if (standing.messages.newThisWeek > 0) {
      list.push(
        standing.messages.newThisWeek === 1
          ? "You got a new message this week"
          : `You got ${standing.messages.newThisWeek} new messages this week`
      );
    }
    if (standing.accounts.newThisWeek > 0) {
      list.push(
        standing.accounts.newThisWeek === 1
          ? "You opened a new account this week"
          : `You opened ${standing.accounts.newThisWeek} new accounts this week`
      );
    }
    return list;
  }, [standing.accounts.newThisWeek, standing.messages.newThisWeek]);

  const slides = useMemo(() => {
    const topMessage = standing.messages.leaders[0];
    const topProspect = standing.prospects.leaders[0];
    const topAccount = standing.accounts.leaders[0];

    return [
      {
        id: "spotlight",
        label: "Spotlight",
        content: (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-500">
              This month&apos;s toppers
            </p>
            <div className="grid sm:grid-cols-3 gap-3">
              {topMessage ? (
                <div className="rounded-xl border border-brand-orange/20 bg-orange-50/70 px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-orange">
                    Messages
                  </p>
                  <p className="font-bold text-neutral-900 mt-1 text-lg">{topMessage.fullName}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {topMessage.count} messages · {topMessage.scorePct}%
                  </p>
                </div>
              ) : (
                <EmptySpot label="Messages" />
              )}
              {topAccount ? (
                <div className="rounded-xl border border-brand-green/20 bg-brand-green-light/50 px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-green">
                    Accounts
                  </p>
                  <p className="font-bold text-neutral-900 mt-1 text-lg">{topAccount.fullName}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {topAccount.count} accounts · {topAccount.scorePct}%
                  </p>
                </div>
              ) : (
                <EmptySpot label="Accounts" />
              )}
              {topProspect ? (
                <div className="rounded-xl border border-sky-200 bg-sky-50/80 px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-600">
                    Prospecting
                  </p>
                  <p className="font-bold text-neutral-900 mt-1 text-lg">{topProspect.fullName}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {topProspect.count} prospects · {topProspect.scorePct}%
                  </p>
                </div>
              ) : (
                <EmptySpot label="Prospecting" />
              )}
            </div>
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs text-neutral-500">
                <span>Your overall performance</span>
                <span className="font-semibold text-violet-600">
                  {standing.overallScorePct}% / 100%
                </span>
              </div>
              <ScaleBar pct={standing.overallScorePct} tone="violet" />
            </div>
          </div>
        ),
      },
      {
        id: "messages",
        label: "Messages",
        content: (
          <LeaderBoard
            title="Messages leaderboard"
            icon={<MessageSquare className="h-4 w-4" />}
            metric={standing.messages}
            teamSize={standing.teamSize}
            unit="messages"
            tone="orange"
          />
        ),
      },
      {
        id: "accounts",
        label: "Accounts",
        content: (
          <LeaderBoard
            title="Accounts leaderboard"
            icon={<Briefcase className="h-4 w-4" />}
            metric={standing.accounts}
            teamSize={standing.teamSize}
            unit="accounts"
            tone="green"
          />
        ),
      },
      {
        id: "prospects",
        label: "Prospecting",
        content: (
          <LeaderBoard
            title="Prospecting leaderboard"
            icon={<Users className="h-4 w-4" />}
            metric={standing.prospects}
            teamSize={standing.teamSize}
            unit="prospects"
            tone="sky"
          />
        ),
      },
    ];
  }, [standing]);

  useEffect(() => {
    if (slides.length <= 1) return;
    setPhase("enter");
    const holdTimer = setTimeout(() => setPhase("hold"), 550);
    const exitTimer = setTimeout(() => setPhase("exit"), SLIDE_MS - EXIT_MS);
    const nextTimer = setTimeout(() => {
      setIndex((i) => (i + 1) % slides.length);
      setPhase("enter");
    }, SLIDE_MS);

    return () => {
      clearTimeout(holdTimer);
      clearTimeout(exitTimer);
      clearTimeout(nextTimer);
    };
  }, [index, slides.length]);

  if (!standing.ok) return null;

  const slide = slides[index] ?? slides[0];
  const phaseClass =
    phase === "enter"
      ? "leader-slide-enter"
      : phase === "exit"
        ? "leader-slide-exit"
        : "leader-slide-hold";

  return (
    <section className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/70 via-white to-brand-green-light/30 shadow-sm overflow-hidden">
      <div className="px-5 py-4 md:px-6 border-b border-violet-100/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 shrink-0">
            <Trophy className="h-5 w-5 text-violet-600" />
          </span>
          <div>
            <h2 className="font-semibold text-neutral-900">Team leaders board</h2>
            <p className="text-sm text-neutral-500 mt-0.5">
              Sliding show of who&apos;s topping messages, accounts, and prospecting.
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
            Your overall
          </p>
          <p className="text-3xl font-extrabold tabular-nums text-violet-600">
            {standing.overallScorePct}%
          </p>
        </div>
      </div>

      <div className="p-5 md:p-6 space-y-4">
        <div className="relative overflow-hidden">
          <div key={slide.id} className={phaseClass}>
            {slide.content}
          </div>
        </div>

        <div className="flex items-center justify-center gap-2">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={`Show ${s.label}`}
              onClick={() => {
                setIndex(i);
                setPhase("enter");
              }}
              className={cn(
                "h-1.5 rounded-full transition-all duration-500",
                i === index ? "w-8 bg-violet-500" : "w-1.5 bg-violet-200 hover:bg-violet-300"
              )}
            />
          ))}
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

function EmptySpot({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-neutral-200 bg-white/70 px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{label}</p>
      <p className="text-sm text-neutral-400 mt-1">No leader yet</p>
    </div>
  );
}
