import { toZonedTime } from "date-fns-tz";
import { getWeeksInMonth } from "@/lib/members/week-utils";
import type { MemberMonthlyPlan, MemberWeeklyEarning } from "@/types/database";

const TZ = "Africa/Lagos";

export function currentYearMonthLagos(date = new Date()): string {
  const now = toZonedTime(date, TZ);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function pct(actual: number, target: number | null | undefined): number | null {
  if (target == null || target <= 0) return null;
  return Math.min(100, Math.round((actual / target) * 100));
}

function hasWeekActivity(e: MemberWeeklyEarning): boolean {
  return (
    Number(e.amount) > 0 ||
    Number(e.prospects_count ?? 0) > 0 ||
    Number(e.office_prospects_count ?? 0) > 0 ||
    Number(e.contacts_count ?? 0) > 0 ||
    Number(e.personal_pv ?? 0) > 0 ||
    Number(e.group_pv ?? 0) > 0 ||
    !!(e.activities_done && e.activities_done.trim()) ||
    !!(e.skills_progress && e.skills_progress.trim())
  );
}

export interface MemberProgressMetrics {
  yearMonth: string;
  incomeActual: number;
  incomeGoal: number | null;
  incomePct: number | null;
  prospectsActual: number;
  prospectsGoal: number | null;
  prospectsPct: number | null;
  contactsActual: number;
  contactsGoal: number | null;
  contactsPct: number | null;
  /** Average of available goal percentages (0–100). */
  overallProgressPct: number;
  weeksLogged: number;
  weeksElapsed: number;
  weeksTotal: number;
  activityPct: number;
  messagesThisMonth: number;
  messagesLastMonth: number;
  messageMomentumPct: number;
}

export function buildMemberProgressMetrics(opts: {
  yearMonth?: string;
  plan?: MemberMonthlyPlan | null;
  earnings?: MemberWeeklyEarning[];
  messagesThisMonth?: number;
  messagesLastMonth?: number;
  now?: Date;
}): MemberProgressMetrics {
  const yearMonth = opts.yearMonth ?? currentYearMonthLagos(opts.now);
  const now = toZonedTime(opts.now ?? new Date(), TZ);
  const dayOfMonth = now.getDate();
  const weeks = getWeeksInMonth(yearMonth);
  const weeksElapsed = Math.max(
    1,
    weeks.filter((w) => w.start <= dayOfMonth).length
  );
  const weeksTotal = weeks.length;

  const monthEarnings = (opts.earnings ?? []).filter((e) => e.year_month === yearMonth);
  const weeksLogged = monthEarnings.filter(hasWeekActivity).length;

  const incomeActual = monthEarnings.reduce((sum, e) => sum + Number(e.amount), 0);
  const prospectsActual = monthEarnings.reduce(
    (sum, e) => sum + Number(e.prospects_count ?? 0),
    0
  );
  const contactsActual = monthEarnings.reduce(
    (sum, e) => sum + Number(e.contacts_count ?? 0),
    0
  );

  const plan = opts.plan ?? null;
  const incomeGoal = plan?.income_goal != null ? Number(plan.income_goal) : null;
  const prospectsGoal =
    plan?.prospects_target != null ? Number(plan.prospects_target) : null;
  const contactsGoal =
    plan?.contacts_expected != null ? Number(plan.contacts_expected) : null;

  const incomePct = pct(incomeActual, incomeGoal);
  const prospectsPct = pct(prospectsActual, prospectsGoal);
  const contactsPct = pct(contactsActual, contactsGoal);

  const goalPcts = [incomePct, prospectsPct, contactsPct].filter(
    (n): n is number => n != null
  );
  const overallProgressPct =
    goalPcts.length > 0
      ? Math.round(goalPcts.reduce((a, b) => a + b, 0) / goalPcts.length)
      : Math.min(100, Math.round((weeksLogged / weeksElapsed) * 100));

  const activityPct = Math.min(100, Math.round((weeksLogged / weeksElapsed) * 100));

  const messagesThisMonth = opts.messagesThisMonth ?? 0;
  const messagesLastMonth = opts.messagesLastMonth ?? 0;
  const messageMomentumPct =
    messagesLastMonth > 0
      ? Math.min(100, Math.round((messagesThisMonth / messagesLastMonth) * 100))
      : messagesThisMonth > 0
        ? 100
        : 0;

  return {
    yearMonth,
    incomeActual,
    incomeGoal,
    incomePct,
    prospectsActual,
    prospectsGoal,
    prospectsPct,
    contactsActual,
    contactsGoal,
    contactsPct,
    overallProgressPct,
    weeksLogged,
    weeksElapsed,
    weeksTotal,
    activityPct,
    messagesThisMonth,
    messagesLastMonth,
    messageMomentumPct,
  };
}
