import type { SupabaseClient } from "@supabase/supabase-js";
import { lagosDayEndIso, lagosDayStartIso } from "@/lib/weekly-evaluation/week";
import { getMemberImageUrl } from "@/lib/storage/member-uploads";
import { INCENTIVE_SLOTS } from "@/lib/incentives/catalog";

export interface ProgressMember {
  id: string;
  full_name: string;
}

export interface StarEvidence {
  id: string;
  team_member_id: string;
  buyer_name: string | null;
  received_date: string;
  screenshot_path: string;
  url: string | null;
}

export interface MonthPack {
  auto: Record<string, Record<string, number>>;
  manual: Record<string, Record<string, string>>;
  stars: StarEvidence[];
}

export async function fetchAll<T>(
  run: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
) {
  const pageSize = 1000;
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await run(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < pageSize) return rows;
  }
}

function monthBounds(yearMonth: string) {
  const [year, month] = yearMonth.split("-").map(Number);
  const last = new Date(year, month, 0).getDate();
  return {
    from: `${yearMonth}-01`,
    to: `${yearMonth}-${String(last).padStart(2, "0")}`,
  };
}

export function monthLabel(yearMonth: string) {
  const [year, month] = yearMonth.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-NG", {
    month: "long",
    year: "numeric",
  });
}

export function shiftMonth(yearMonth: string, delta: number) {
  const [year, month] = yearMonth.split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export async function loadMonthPack(db: SupabaseClient, yearMonth: string): Promise<MonthPack> {
  const bounds = monthBounds(yearMonth);
  const createdFrom = lagosDayStartIso(bounds.from);
  const createdTo = lagosDayEndIso(bounds.to);

  const [prospects, earnings, orders, openedAccounts, createdAccounts, messages, scores, starPage] =
    await Promise.all([
      fetchAll<{ team_member_id: string; office_prospects_count: number | null }>((from, to) =>
        db
          .from("member_prospect_entries")
          .select("team_member_id, office_prospects_count")
          .gte("logged_date", bounds.from)
          .lte("logged_date", bounds.to)
          .range(from, to)
      ),
      fetchAll<{
        team_member_id: string;
        amount_ngn: number | null;
        amount: number | null;
        gross_amount: number | null;
        currency: string | null;
      }>((from, to) =>
        db
          .from("member_weekly_earnings")
          .select("team_member_id, amount_ngn, amount, gross_amount, currency")
          .eq("year_month", yearMonth)
          .range(from, to)
      ),
      fetchAll<{ team_member_id: string; order_amount: number | null }>((from, to) =>
        db
          .from("orders_received")
          .select("team_member_id, order_amount")
          .gte("received_date", bounds.from)
          .lte("received_date", bounds.to)
          .range(from, to)
      ),
      fetchAll<{ id: string; team_member_id: string }>((from, to) =>
        db
          .from("fiverr_accounts")
          .select("id, team_member_id")
          .gte("opening_date", bounds.from)
          .lte("opening_date", bounds.to)
          .is("archived_at", null)
          .neq("status", "reserved")
          .range(from, to)
      ),
      fetchAll<{ id: string; team_member_id: string }>((from, to) =>
        db
          .from("fiverr_accounts")
          .select("id, team_member_id")
          .gte("created_at", createdFrom)
          .lte("created_at", createdTo)
          .is("archived_at", null)
          .neq("status", "reserved")
          .range(from, to)
      ),
      fetchAll<{ team_member_id: string }>((from, to) =>
        db
          .from("messages")
          .select("team_member_id")
          .gte("received_date", bounds.from)
          .lte("received_date", bounds.to)
          .range(from, to)
      ),
      fetchAll<{ slot: string; team_member_id: string; score: number | null }>((from, to) =>
        db
          .from("incentive_scores")
          .select("slot, team_member_id, score")
          .eq("year_month", yearMonth)
          .range(from, to)
      ),
      fetchAll<Omit<StarEvidence, "url">>((from, to) =>
        db
          .from("five_star_reviews")
          .select("id, team_member_id, buyer_name, received_date, screenshot_path")
          .gte("received_date", bounds.from)
          .lte("received_date", bounds.to)
          .order("received_date", { ascending: false })
          .range(from, to)
      ),
    ]);

  const add = (bucket: Record<string, number>, id: string | null, amount: number) => {
    if (!id) return;
    bucket[id] = (bucket[id] ?? 0) + amount;
  };
  const office: Record<string, number> = {};
  for (const row of prospects) add(office, row.team_member_id, Number(row.office_prospects_count ?? 0));
  const weeklyEarn: Record<string, number> = {};
  for (const row of earnings) {
    const ngn = Number(row.amount_ngn ?? 0);
    const net = Number(row.amount ?? 0);
    const gross = Number(row.gross_amount ?? 0);
    const value = ngn > 0 ? ngn : net > 0 ? net : gross;
    add(weeklyEarn, row.team_member_id, value);
  }
  const orderEarn: Record<string, number> = {};
  for (const row of orders) add(orderEarn, row.team_member_id, Number(row.order_amount ?? 0));
  const earn: Record<string, number> = {};
  for (const id of new Set([...Object.keys(weeklyEarn), ...Object.keys(orderEarn)])) {
    const weekly = weeklyEarn[id] ?? 0;
    earn[id] = weekly > 0 ? weekly : (orderEarn[id] ?? 0);
  }
  const opened: Record<string, number> = {};
  const seenAccounts = new Set<string>();
  for (const row of [...openedAccounts, ...createdAccounts]) {
    if (seenAccounts.has(row.id)) continue;
    seenAccounts.add(row.id);
    add(opened, row.team_member_id, 1);
  }
  const received: Record<string, number> = {};
  for (const row of messages) add(received, row.team_member_id, 1);
  const stars = await Promise.all(
    starPage.map(async (review) => ({
      ...review,
      url: await getMemberImageUrl(db, review.screenshot_path),
    }))
  );
  const starCounts: Record<string, number> = {};
  for (const row of stars) add(starCounts, row.team_member_id, 1);

  const manual: Record<string, Record<string, string>> = {};
  for (const slot of INCENTIVE_SLOTS) {
    if (slot.source === "manual") manual[slot.slot] = {};
  }
  for (const row of scores) {
    if (!manual[row.slot]) manual[row.slot] = {};
    manual[row.slot][row.team_member_id] = String(row.score ?? 0);
  }

  return {
    auto: {
      office_prospects: office,
      top_earner: earn,
      top_accounts: opened,
      top_messages: received,
      five_stars: starCounts,
    },
    manual,
    stars,
  };
}
