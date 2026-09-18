import Link from "next/link";
import { redirect } from "next/navigation";
import { Banknote, Users, TrendingUp, Percent, Globe2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth/scope";
import { isSuperAdmin } from "@/lib/auth/permissions";
import { currentYearMonth, formatYearMonthLabel } from "@/lib/utils/dates";
import { convertWithGbpBaseRates, formatMoney, formatNgn } from "@/lib/money/earnings";
import { MoneyMonthPicker } from "@/components/admin/money-month-picker";
import {
  MoneyMadeTable,
  type MoneyMemberRow,
} from "@/components/admin/money-made-table";
import type { MemberWeeklyEarning } from "@/types/database";
import type { ExchangeRates } from "@/app/api/currency/rates/route";

interface Props {
  searchParams: Promise<{ month?: string }>;
}

async function fetchRates(): Promise<ExchangeRates | null> {
  const key = process.env.EXCHANGE_RATE_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`https://v6.exchangerate-api.com/v6/${key}/latest/GBP`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.result !== "success") return null;
    return {
      base: "GBP",
      rates: {
        NGN: json.conversion_rates.NGN,
        USD: json.conversion_rates.USD,
        EUR: json.conversion_rates.EUR,
        GBP: 1,
      },
      fetched_at: new Date().toISOString(),
      next_update: json.time_next_update_utc,
    };
  } catch {
    return null;
  }
}

function resolveNgn(
  e: MemberWeeklyEarning,
  rates: Record<string, number> | null
): number {
  if (e.amount_ngn != null && Number(e.amount_ngn) > 0) return Number(e.amount_ngn);
  const net = Number(e.amount) || 0;
  if (net <= 0) return 0;
  if (e.currency === "NGN") return net;
  if (!rates) return 0;
  const ngn = convertWithGbpBaseRates(net, e.currency || "USD", "NGN", rates);
  return Number.isFinite(ngn) ? ngn : 0;
}

export default async function MoneyMadePage({ searchParams }: Props) {
  const scope = await getUserScope();
  if (!scope) redirect("/login");

  const superAdmin = await isSuperAdmin();
  if (!superAdmin && !scope.permissions.some((p) => p.includes("super"))) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const monthParam = params.month;
  const yearMonth =
    monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : currentYearMonth();

  const supabase = await createClient();
  const ratesPayload = await fetchRates();
  const rates = ratesPayload?.rates ?? null;

  const [{ data: members }, { data: earnings }] = await Promise.all([
    supabase
      .from("team_members")
      .select("id, full_name, preferred_name, status, user_id")
      .order("full_name"),
    supabase
      .from("member_weekly_earnings")
      .select("*")
      .eq("year_month", yearMonth)
      .order("week_number", { ascending: true }),
  ]);

  const earningsList = (earnings ?? []) as MemberWeeklyEarning[];
  const byMember = new Map<string, MemberWeeklyEarning[]>();
  for (const e of earningsList) {
    const list = byMember.get(e.team_member_id) ?? [];
    list.push(e);
    byMember.set(e.team_member_id, list);
  }

  const myMemberId = scope.teamMember?.id ?? null;

  const rows: MoneyMemberRow[] = (members ?? []).map((m) => {
    const entries = byMember.get(m.id) ?? [];
    let netNgn = 0;
    let fees = 0;
    let fiverrNet = 0;
    let outsideNgn = 0;
    let weeksWithMoney = 0;

    for (const e of entries) {
      const net = Number(e.amount) || 0;
      if (net <= 0) continue;
      weeksWithMoney += 1;
      const ngn = resolveNgn(e, rates);
      netNgn += ngn;
      fees += Number(e.fee_amount) || 0;
      if (e.payment_source === "outside") {
        outsideNgn += ngn;
      } else {
        fiverrNet += net;
      }
    }

    return {
      memberId: m.id,
      fullName: m.full_name,
      preferredName: m.preferred_name,
      isYou: myMemberId === m.id,
      netNgn,
      grossUsdLike: entries.reduce(
        (s, e) => s + Number(e.gross_amount ?? e.amount ?? 0),
        0
      ),
      fees,
      fiverrNet,
      outsideNgn,
      weeksWithMoney,
      entries,
    };
  });

  rows.sort((a, b) => {
    if (a.isYou && !b.isYou && a.netNgn === 0 && b.netNgn === 0) return -1;
    if (b.isYou && !a.isYou && a.netNgn === 0 && b.netNgn === 0) return 1;
    if (a.netNgn !== b.netNgn) return b.netNgn - a.netNgn;
    return a.fullName.localeCompare(b.fullName);
  });

  const teamTotalNgn = rows.reduce((s, r) => s + r.netNgn, 0);
  const teamFees = rows.reduce((s, r) => s + r.fees, 0);
  const teamOutside = rows.reduce((s, r) => s + r.outsideNgn, 0);
  const earners = rows.filter((r) => r.netNgn > 0).length;
  const youRow = rows.find((r) => r.isYou);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
            <Banknote className="h-6 w-6 text-brand-green" />
            Money Made
          </h1>
          <p className="text-neutral-500 mt-1 max-w-2xl">
            Net earnings for every team member in{" "}
            <span className="font-medium text-neutral-700">
              {formatYearMonthLabel(yearMonth)}
            </span>
            , including you. Fiverr amounts are after the automatic service fee; outside
            payments are converted to Naira.
          </p>
        </div>
        <MoneyMonthPicker value={yearMonth} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
          iconBg="bg-emerald-100"
          label="Team total (₦)"
          value={formatNgn(teamTotalNgn)}
        />
        <SummaryCard
          icon={<Users className="h-4 w-4 text-sky-600" />}
          iconBg="bg-sky-100"
          label="Members who earned"
          value={String(earners)}
        />
        <SummaryCard
          icon={<Percent className="h-4 w-4 text-red-600" />}
          iconBg="bg-red-100"
          label="Fiverr fees removed"
          value={formatMoney(teamFees)}
        />
        <SummaryCard
          icon={<Globe2 className="h-4 w-4 text-violet-600" />}
          iconBg="bg-violet-100"
          label="Outside payments (₦)"
          value={formatNgn(teamOutside)}
        />
      </div>

      {youRow ? (
        <div className="rounded-xl border border-brand-orange/30 bg-gradient-to-r from-brand-orange/10 to-white px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-orange">
              Your earnings this month
            </p>
            <p className="text-2xl font-extrabold text-neutral-900 mt-0.5 tabular-nums">
              {formatNgn(youRow.netNgn)}
            </p>
            <p className="text-xs text-neutral-500 mt-1">
              {youRow.preferredName || youRow.fullName}
              {youRow.fees > 0 ? ` · fees removed ${formatMoney(youRow.fees)}` : ""}
            </p>
          </div>
          <Link
            href={`/team-members/${youRow.memberId}`}
            className="text-sm font-medium text-brand-green hover:underline"
          >
            View your profile →
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Your login is not linked to a team member profile, so you won&apos;t appear in
          this list. Link your user to a team member to include yourself.
        </div>
      )}

      <MoneyMadeTable rows={rows} />
    </div>
  );
}

function SummaryCard({
  icon,
  iconBg,
  label,
  value,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">{label}</p>
          <p className="text-xl font-extrabold text-neutral-900 mt-1 tabular-nums">{value}</p>
        </div>
        <div className={`h-9 w-9 rounded-lg ${iconBg} flex items-center justify-center`}>{icon}</div>
      </div>
    </div>
  );
}
