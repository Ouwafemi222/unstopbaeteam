export interface StandingLeader {
  rank: number;
  memberId: string;
  fullName: string;
  preferredName: string | null;
  count: number;
  scorePct: number;
  isMe: boolean;
}

export interface StandingMetric {
  mine: number;
  max: number;
  rank: number;
  scorePct: number;
  newThisWeek: number;
  leaders: StandingLeader[];
}

export interface MemberTeamStanding {
  ok: boolean;
  error?: string;
  teamSize: number;
  periodFrom: string;
  periodTo: string;
  yearMonth?: string;
  messages: StandingMetric;
  accounts: StandingMetric;
  prospects: StandingMetric;
  overallScorePct: number;
}

function emptyMetric(): StandingMetric {
  return {
    mine: 0,
    max: 0,
    rank: 1,
    scorePct: 0,
    newThisWeek: 0,
    leaders: [],
  };
}

export function emptyStanding(): MemberTeamStanding {
  return {
    ok: false,
    teamSize: 0,
    periodFrom: "",
    periodTo: "",
    messages: emptyMetric(),
    accounts: emptyMetric(),
    prospects: emptyMetric(),
    overallScorePct: 0,
  };
}

function readLeaders(raw: unknown): StandingLeader[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const row = (item ?? {}) as Record<string, unknown>;
    return {
      rank: Number(row.rank ?? 0),
      memberId: String(row.memberId ?? ""),
      fullName: String(row.fullName ?? "Member"),
      preferredName: row.preferredName != null ? String(row.preferredName) : null,
      count: Number(row.count ?? 0),
      scorePct: Number(row.scorePct ?? 0),
      isMe: Boolean(row.isMe),
    };
  });
}

function readMetric(data: Record<string, unknown>, key: string): StandingMetric {
  const m = (data[key] ?? {}) as Record<string, unknown>;
  return {
    mine: Number(m.mine ?? 0),
    max: Number(m.max ?? 0),
    rank: Number(m.rank ?? 1),
    scorePct: Number(m.scorePct ?? 0),
    newThisWeek: Number(m.newThisWeek ?? 0),
    leaders: readLeaders(m.leaders),
  };
}

export function parseStanding(raw: unknown): MemberTeamStanding {
  if (!raw || typeof raw !== "object") return emptyStanding();
  const data = raw as Record<string, unknown>;
  if (data.ok === false) {
    return { ...emptyStanding(), error: String(data.error ?? "unavailable") };
  }

  return {
    ok: true,
    teamSize: Number(data.teamSize ?? 0),
    periodFrom: String(data.periodFrom ?? ""),
    periodTo: String(data.periodTo ?? ""),
    yearMonth: data.yearMonth != null ? String(data.yearMonth) : undefined,
    messages: readMetric(data, "messages"),
    accounts: readMetric(data, "accounts"),
    prospects: readMetric(data, "prospects"),
    overallScorePct: Number(data.overallScorePct ?? 0),
  };
}
