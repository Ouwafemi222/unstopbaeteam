import { formatDate, getMessageServiceLabel } from "@/lib/utils";
import type { FiverrAccount, Message, MemberDailyEarning, MemberMonthlyPlan } from "@/types/database";

export type MemberActivityType =
  | "account"
  | "message"
  | "earning"
  | "monthly_plan"
  | "milestone";

export interface MemberActivityItem {
  id: string;
  type: MemberActivityType;
  label: string;
  detail?: string;
  created_at: string;
}

function formatMoney(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

export function buildMemberActivityFeed(opts: {
  accounts: FiverrAccount[];
  messages: Message[];
  earnings?: MemberDailyEarning[];
  monthlyPlans?: MemberMonthlyPlan[];
  limit?: number;
}): MemberActivityItem[] {
  const items: MemberActivityItem[] = [];

  for (const acc of opts.accounts) {
    const at = acc.created_at ?? acc.opening_date ?? new Date().toISOString();
    items.push({
      id: `account-${acc.id}`,
      type: "account",
      label: `Opened Fiverr account @${acc.username}`,
      detail: acc.opening_date ? `Opening date: ${formatDate(acc.opening_date)}` : undefined,
      created_at: at,
    });
  }

  for (const msg of opts.messages) {
    const service = getMessageServiceLabel(msg);
    const at = msg.created_at ?? `${msg.received_date}T12:00:00Z`;
    items.push({
      id: `message-${msg.id}`,
      type: "message",
      label: `Received a message${service !== "—" ? ` (${service})` : ""}`,
      detail: msg.gig_name ? `Gig: ${msg.gig_name}` : formatDate(msg.received_date),
      created_at: at,
    });
  }

  for (const e of opts.earnings ?? []) {
    items.push({
      id: `earning-${e.id}`,
      type: "earning",
      label: `Logged earnings of ${formatMoney(Number(e.amount), e.currency)}`,
      detail: e.notes ?? formatDate(e.earned_date),
      created_at: e.updated_at ?? e.created_at,
    });
  }

  for (const plan of opts.monthlyPlans ?? []) {
    if (!plan.updated_at && !plan.goals && !plan.evaluation) continue;
    items.push({
      id: `plan-${plan.id}`,
      type: "monthly_plan",
      label: `Updated monthly plan for ${plan.year_month}`,
      detail: plan.income_goal
        ? `Income goal: ${formatMoney(Number(plan.income_goal))}`
        : undefined,
      created_at: plan.updated_at ?? plan.created_at,
    });
  }

  if (opts.accounts.length > 0) {
    items.push({
      id: "milestone-accounts",
      type: "milestone",
      label: `${opts.accounts.length} Fiverr account${opts.accounts.length === 1 ? "" : "s"} opened in total`,
      created_at: opts.accounts[0]?.created_at ?? new Date().toISOString(),
    });
  }

  if (opts.messages.length > 0) {
    items.push({
      id: "milestone-messages",
      type: "milestone",
      label: `${opts.messages.length} message${opts.messages.length === 1 ? "" : "s"} recorded in total`,
      created_at: opts.messages[0]?.created_at ?? new Date().toISOString(),
    });
  }

  const sorted = items.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const cap = opts.limit ?? 50;
  return sorted.slice(0, cap);
}

export function activityTypeLabel(type: MemberActivityType): string {
  switch (type) {
    case "account": return "Account";
    case "message": return "Message";
    case "earning": return "Earnings";
    case "monthly_plan": return "Monthly Plan";
    case "milestone": return "Summary";
    default: return "Activity";
  }
}
