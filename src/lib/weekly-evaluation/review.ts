import type { SupabaseClient } from "@supabase/supabase-js";
import { getWeeksInMonth } from "@/lib/members/week-utils";
import type { EvaluationTallyKey, EvaluationTopicKind } from "@/lib/weekly-evaluation/template";
import {
  currentPublishWindow,
  formatSheetRange,
  lagosDayEndIso,
  lagosDayStartIso,
  rangesOverlap,
} from "@/lib/weekly-evaluation/week";

export type EvaluationRound = {
  id: string;
  week_start: string;
  week_end: string;
  title: string;
  status: string;
  published_at: string;
};

export type SheetTopic = {
  id: string;
  position: number;
  tallyKey: EvaluationTallyKey | null;
  title: string;
  prompt: string;
  kind: EvaluationTopicKind;
};

export type RecordedWeek = {
  accounts: number;
  accountNames: string[];
  messages: number;
  orders: number;
  orderAmount: number;
  currencies: string[];
  prospects: number;
  officeProspects: number;
  activities: string[];
};

export type ReviewLine = {
  topicId: string;
  title: string;
  kind: EvaluationTopicKind;
  claimed: string;
  recordedLabel: string | null;
  matches: boolean | null;
};

export type MemberReview = {
  teamMemberId: string;
  name: string;
  submitted: boolean;
  reviewDate: string | null;
  notes: string | null;
  lines: ReviewLine[];
  recorded: RecordedWeek;
  hasMismatch: boolean;
};

export type OwnSubmission = {
  id: string;
  reviewDate: string;
  notes: string | null;
  answers: { topicId: string; valueText: string | null; valueNumber: number | null }[];
};

export type EvaluationSnapshot = {
  ok: true;
  missingTable: false;
  windowLabel: string;
  canPublish: boolean;
  activeRound: EvaluationRound | null;
  topics: SheetTopic[];
  reviews: MemberReview[];
  previousRound: EvaluationRound | null;
  previousReviews: MemberReview[];
};

export type EvaluationUnavailable = {
  ok: false;
  missingTable: boolean;
  message: string;
};

type DbError = { code?: string; message?: string } | null;

function isMissingTable(error: DbError): boolean {
  if (!error) return false;
  const message = error.message ?? "";
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /does not exist|schema cache|could not find the table/i.test(message)
  );
}

function emptyRecorded(): RecordedWeek {
  return {
    accounts: 0,
    accountNames: [],
    messages: 0,
    orders: 0,
    orderAmount: 0,
    currencies: [],
    prospects: 0,
    officeProspects: 0,
    activities: [],
  };
}

export function parseWrittenNumber(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const number = Number(match[0]);
  return Number.isFinite(number) ? number : null;
}

function mapTopic(row: {
  id: string;
  position: number;
  tally_key: string | null;
  title: string;
  prompt: string;
  kind: string;
}): SheetTopic {
  const tallyKey =
    row.tally_key === "accounts" ||
    row.tally_key === "prospects" ||
    row.tally_key === "messages" ||
    row.tally_key === "orders" ||
    row.tally_key === "order_amount"
      ? row.tally_key
      : null;
  const kind: EvaluationTopicKind =
    row.kind === "amount" || row.kind === "text" ? row.kind : "count";
  return {
    id: row.id,
    position: row.position,
    tallyKey,
    title: row.title,
    prompt: row.prompt,
    kind,
  };
}

function mapRound(row: EvaluationRound): EvaluationRound {
  return {
    id: row.id,
    week_start: row.week_start,
    week_end: row.week_end,
    title: row.title,
    status: row.status,
    published_at: row.published_at,
  };
}

async function fetchRound(
  supabase: SupabaseClient,
  mode: "active" | "latest"
): Promise<{ round: EvaluationRound | null; missingTable: boolean; message?: string }> {
  const window = currentPublishWindow();
  let query = supabase
    .from("weekly_evaluation_rounds")
    .select("id, week_start, week_end, title, status, published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(1);

  if (mode === "active") {
    query = query.lte("week_start", window.weekEnd).gte("week_end", window.weekStart);
  }

  const { data, error } = await query.maybeSingle();
  if (isMissingTable(error)) return { round: null, missingTable: true };
  if (error) return { round: null, missingTable: false, message: error.message };
  return { round: data ? mapRound(data as EvaluationRound) : null, missingTable: false };
}

async function fetchTopics(supabase: SupabaseClient, roundId: string): Promise<SheetTopic[]> {
  const { data, error } = await supabase
    .from("weekly_evaluation_topics")
    .select("id, position, tally_key, title, prompt, kind")
    .eq("round_id", roundId)
    .order("position", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapTopic(row as Parameters<typeof mapTopic>[0]));
}

function recordedNumber(key: EvaluationTallyKey, recorded: RecordedWeek): number {
  switch (key) {
    case "accounts":
      return recorded.accounts;
    case "prospects":
      return recorded.prospects;
    case "messages":
      return recorded.messages;
    case "orders":
      return recorded.orders;
    case "order_amount":
      return recorded.orderAmount;
  }
}

function recordedLabel(key: EvaluationTallyKey, recorded: RecordedWeek): string {
  switch (key) {
    case "accounts":
      return String(recorded.accounts);
    case "prospects":
      return String(recorded.prospects);
    case "messages":
      return String(recorded.messages);
    case "orders":
      return String(recorded.orders);
    case "order_amount": {
      const money = recorded.orderAmount.toLocaleString(undefined, {
        maximumFractionDigits: 2,
      });
      if (recorded.currencies.length === 1) return `${money} ${recorded.currencies[0]}`;
      if (recorded.currencies.length > 1) return `${money} (${recorded.currencies.join(", ")})`;
      return money;
    }
  }
}

function buildLines(
  topics: SheetTopic[],
  answers: { topicId: string; valueText: string | null; valueNumber: number | null }[],
  recorded: RecordedWeek,
  submitted: boolean
): { lines: ReviewLine[]; hasMismatch: boolean } {
  const byTopic = new Map(answers.map((answer) => [answer.topicId, answer]));
  let hasMismatch = false;
  const lines = topics.map((topic) => {
    const answer = byTopic.get(topic.id);
    if (!submitted) {
      return {
        topicId: topic.id,
        title: topic.title,
        kind: topic.kind,
        claimed: "Not submitted",
        recordedLabel: topic.tallyKey ? recordedLabel(topic.tallyKey, recorded) : null,
        matches: null,
      };
    }
    if (topic.kind === "text" || !topic.tallyKey) {
      return {
        topicId: topic.id,
        title: topic.title,
        kind: topic.kind,
        claimed: answer?.valueText?.trim() || "—",
        recordedLabel: null,
        matches: null,
      };
    }
    const claimedNumber =
      answer?.valueNumber != null ? Number(answer.valueNumber) : parseWrittenNumber(answer?.valueText);
    const actual = recordedNumber(topic.tallyKey, recorded);
    const matches = claimedNumber != null && Math.abs(claimedNumber - actual) < 0.009;
    if (!matches) hasMismatch = true;
    const claimed =
      claimedNumber == null
        ? "—"
        : topic.kind === "amount"
          ? (answer?.valueText?.trim() || String(claimedNumber))
          : String(claimedNumber);
    return {
      topicId: topic.id,
      title: topic.title,
      kind: topic.kind,
      claimed,
      recordedLabel: recordedLabel(topic.tallyKey, recorded),
      matches,
    };
  });
  return { lines, hasMismatch };
}

async function loadRecordedByMember(
  supabase: SupabaseClient,
  weekStart: string,
  weekEnd: string,
  memberIds: string[]
): Promise<Map<string, RecordedWeek>> {
  const map = new Map<string, RecordedWeek>();
  for (const id of memberIds) map.set(id, emptyRecorded());
  if (memberIds.length === 0) return map;

  const startIso = lagosDayStartIso(weekStart);
  const endIso = lagosDayEndIso(weekEnd);
  const months = [...new Set([weekStart.slice(0, 7), weekEnd.slice(0, 7)])];

  const [opened, created, messages, orders, prospects, earnings] = await Promise.all([
    supabase
      .from("fiverr_accounts")
      .select("id, team_member_id, username, opening_date")
      .in("team_member_id", memberIds)
      .is("archived_at", null)
      .neq("status", "reserved")
      .gte("opening_date", weekStart)
      .lte("opening_date", weekEnd),
    supabase
      .from("fiverr_accounts")
      .select("id, team_member_id, username, created_at")
      .in("team_member_id", memberIds)
      .is("archived_at", null)
      .neq("status", "reserved")
      .gte("created_at", startIso)
      .lte("created_at", endIso),
    supabase
      .from("messages")
      .select("id, team_member_id")
      .in("team_member_id", memberIds)
      .gte("received_date", weekStart)
      .lte("received_date", weekEnd),
    supabase
      .from("orders_received")
      .select("id, team_member_id, order_amount, currency")
      .in("team_member_id", memberIds)
      .gte("received_date", weekStart)
      .lte("received_date", weekEnd),
    supabase
      .from("member_prospect_entries")
      .select("team_member_id, prospects_count, office_prospects_count")
      .in("team_member_id", memberIds)
      .gte("logged_date", weekStart)
      .lte("logged_date", weekEnd),
    supabase
      .from("member_weekly_earnings")
      .select("team_member_id, year_month, week_number, activities_done")
      .in("team_member_id", memberIds)
      .in("year_month", months),
  ]);

  const seenAccounts = new Set<string>();
  for (const row of [...(opened.data ?? []), ...(created.data ?? [])] as {
    id: string;
    team_member_id: string;
    username: string;
  }[]) {
    if (seenAccounts.has(row.id)) continue;
    seenAccounts.add(row.id);
    const bucket = map.get(row.team_member_id);
    if (!bucket) continue;
    bucket.accounts += 1;
    if (bucket.accountNames.length < 8) bucket.accountNames.push(row.username);
  }

  for (const row of (messages.data ?? []) as { team_member_id: string }[]) {
    const bucket = map.get(row.team_member_id);
    if (bucket) bucket.messages += 1;
  }

  for (const row of (orders.data ?? []) as {
    team_member_id: string;
    order_amount: number | null;
    currency: string | null;
  }[]) {
    const bucket = map.get(row.team_member_id);
    if (!bucket) continue;
    bucket.orders += 1;
    if (row.order_amount != null && Number.isFinite(Number(row.order_amount))) {
      bucket.orderAmount += Number(row.order_amount);
    }
    if (row.currency && !bucket.currencies.includes(row.currency)) {
      bucket.currencies.push(row.currency);
    }
  }

  for (const row of (prospects.data ?? []) as {
    team_member_id: string;
    prospects_count: number | null;
    office_prospects_count: number | null;
  }[]) {
    const bucket = map.get(row.team_member_id);
    if (!bucket) continue;
    bucket.prospects += Number(row.prospects_count ?? 0);
    bucket.officeProspects += Number(row.office_prospects_count ?? 0);
  }

  for (const row of (earnings.data ?? []) as {
    team_member_id: string;
    year_month: string;
    week_number: number;
    activities_done: string | null;
  }[]) {
    if (!row.activities_done?.trim()) continue;
    const weeks = getWeeksInMonth(row.year_month);
    const week = weeks.find((item) => item.week === row.week_number);
    if (!week) continue;
    const [year, month] = row.year_month.split("-");
    const start = `${year}-${month}-${String(week.start).padStart(2, "0")}`;
    const end = `${year}-${month}-${String(week.end).padStart(2, "0")}`;
    if (!rangesOverlap(start, end, weekStart, weekEnd)) continue;
    const bucket = map.get(row.team_member_id);
    if (!bucket) continue;
    bucket.activities.push(row.activities_done.trim());
  }

  return map;
}

async function buildReviews(
  supabase: SupabaseClient,
  round: EvaluationRound,
  topics: SheetTopic[]
): Promise<MemberReview[]> {
  const [{ data: members, error: membersError }, { data: submissions, error: submissionsError }] =
    await Promise.all([
      supabase
        .from("team_members")
        .select("id, full_name, preferred_name")
        .eq("status", "active")
        .order("full_name"),
      supabase
        .from("weekly_evaluation_submissions")
        .select(
          "id, team_member_id, review_date, notes, answers:weekly_evaluation_answers(topic_id, value_text, value_number)"
        )
        .eq("round_id", round.id),
    ]);

  if (membersError) throw new Error(membersError.message);
  if (submissionsError) throw new Error(submissionsError.message);

  const memberRows = (members ?? []) as {
    id: string;
    full_name: string;
    preferred_name: string | null;
  }[];
  const recorded = await loadRecordedByMember(
    supabase,
    round.week_start,
    round.week_end,
    memberRows.map((member) => member.id)
  );

  const submissionByMember = new Map<
    string,
    {
      reviewDate: string;
      notes: string | null;
      answers: { topicId: string; valueText: string | null; valueNumber: number | null }[];
    }
  >();

  for (const row of (submissions ?? []) as {
    team_member_id: string;
    review_date: string;
    notes: string | null;
    answers:
      | { topic_id: string; value_text: string | null; value_number: number | null }[]
      | { topic_id: string; value_text: string | null; value_number: number | null }
      | null;
  }[]) {
    const answerRows = Array.isArray(row.answers) ? row.answers : row.answers ? [row.answers] : [];
    submissionByMember.set(row.team_member_id, {
      reviewDate: row.review_date,
      notes: row.notes,
      answers: answerRows.map((answer) => ({
        topicId: answer.topic_id,
        valueText: answer.value_text,
        valueNumber: answer.value_number == null ? null : Number(answer.value_number),
      })),
    });
  }

  const reviews = memberRows.map((member) => {
    const submission = submissionByMember.get(member.id);
    const recordedWeek = recorded.get(member.id) ?? emptyRecorded();
    const { lines, hasMismatch } = buildLines(
      topics,
      submission?.answers ?? [],
      recordedWeek,
      Boolean(submission)
    );
    return {
      teamMemberId: member.id,
      name: member.preferred_name || member.full_name,
      submitted: Boolean(submission),
      reviewDate: submission?.reviewDate ?? null,
      notes: submission?.notes ?? null,
      lines,
      recorded: recordedWeek,
      hasMismatch,
    };
  });

  reviews.sort((a, b) => {
    if (a.hasMismatch !== b.hasMismatch) return a.hasMismatch ? -1 : 1;
    if (a.submitted !== b.submitted) return a.submitted ? 1 : -1;
    return a.name.localeCompare(b.name);
  });
  return reviews;
}

export async function loadEvaluationSnapshot(
  supabase: SupabaseClient
): Promise<EvaluationSnapshot | EvaluationUnavailable> {
  const window = currentPublishWindow();
  const activeResult = await fetchRound(supabase, "active");
  if (activeResult.missingTable) {
    return {
      ok: false,
      missingTable: true,
      message: "The weekly evaluation tables are not in the database yet.",
    };
  }
  if (activeResult.message) {
    return { ok: false, missingTable: false, message: activeResult.message };
  }

  const activeRound = activeResult.round;
  let previousRound: EvaluationRound | null = null;
  if (!activeRound) {
    const latest = await fetchRound(supabase, "latest");
    if (latest.message) return { ok: false, missingTable: false, message: latest.message };
    previousRound = latest.round;
  }

  try {
    const topics = activeRound ? await fetchTopics(supabase, activeRound.id) : [];
    const reviews = activeRound ? await buildReviews(supabase, activeRound, topics) : [];
    let previousReviews: MemberReview[] = [];
    if (previousRound) {
      const previousTopics = await fetchTopics(supabase, previousRound.id);
      previousReviews = await buildReviews(supabase, previousRound, previousTopics);
    }
    return {
      ok: true,
      missingTable: false,
      windowLabel: formatSheetRange(window.weekStart, window.weekEnd),
      canPublish: !activeRound,
      activeRound,
      topics,
      reviews,
      previousRound,
      previousReviews,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load the evaluation.";
    if (isMissingTable({ message })) {
      return { ok: false, missingTable: true, message };
    }
    return { ok: false, missingTable: false, message };
  }
}

export async function loadMemberSheet(
  supabase: SupabaseClient,
  teamMemberId: string
): Promise<
  | EvaluationUnavailable
  | {
      ok: true;
      round: EvaluationRound | null;
      topics: SheetTopic[];
      submission: OwnSubmission | null;
      rangeLabel: string | null;
    }
> {
  const active = await fetchRound(supabase, "active");
  if (active.missingTable) {
    return { ok: false, missingTable: true, message: "Weekly evaluation is not ready yet." };
  }
  if (active.message) return { ok: false, missingTable: false, message: active.message };
  if (!active.round) {
    return { ok: true, round: null, topics: [], submission: null, rangeLabel: null };
  }

  let topics: SheetTopic[];
  try {
    topics = await fetchTopics(supabase, active.round.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load the sheet.";
    return { ok: false, missingTable: isMissingTable({ message }), message };
  }
  const { data, error } = await supabase
    .from("weekly_evaluation_submissions")
    .select(
      "id, review_date, notes, answers:weekly_evaluation_answers(topic_id, value_text, value_number)"
    )
    .eq("round_id", active.round.id)
    .eq("team_member_id", teamMemberId)
    .maybeSingle();

  if (error) return { ok: false, missingTable: false, message: error.message };

  let submission: OwnSubmission | null = null;
  if (data) {
    const row = data as {
      id: string;
      review_date: string;
      notes: string | null;
      answers:
        | { topic_id: string; value_text: string | null; value_number: number | null }[]
        | null;
    };
    submission = {
      id: row.id,
      reviewDate: row.review_date,
      notes: row.notes,
      answers: (row.answers ?? []).map((answer) => ({
        topicId: answer.topic_id,
        valueText: answer.value_text,
        valueNumber: answer.value_number == null ? null : Number(answer.value_number),
      })),
    };
  }

  return {
    ok: true,
    round: active.round,
    topics,
    submission,
    rangeLabel: formatSheetRange(active.round.week_start, active.round.week_end),
  };
}

export function recordedSummary(recorded: RecordedWeek): string {
  const parts = [
    `${recorded.accounts} account${recorded.accounts === 1 ? "" : "s"}`,
    `${recorded.messages} message${recorded.messages === 1 ? "" : "s"}`,
    `${recorded.orders} order${recorded.orders === 1 ? "" : "s"}`,
    `${recorded.prospects} prospect${recorded.prospects === 1 ? "" : "s"}`,
  ];
  if (recorded.officeProspects > 0) {
    parts.push(`${recorded.officeProspects} office prospect${recorded.officeProspects === 1 ? "" : "s"}`);
  }
  if (recorded.accountNames.length > 0) {
    parts.push(recorded.accountNames.join(", "));
  }
  return parts.join(" · ");
}
