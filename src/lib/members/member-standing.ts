export interface StandingMetric {
  mine: number;
  max: number;
  rank: number;
  scorePct: number;
  newThisWeek: number;
}

export interface MemberTeamStanding {
  ok: boolean;
  error?: string;
  teamSize: number;
  periodFrom: string;
  periodTo: string;
  messages: StandingMetric;
  accounts: StandingMetric;
  overallScorePct: number;
}

export function emptyStanding(): MemberTeamStanding {
  const zero: StandingMetric = {
    mine: 0,
    max: 0,
    rank: 1,
    scorePct: 0,
    newThisWeek: 0,
  };
  return {
    ok: false,
    teamSize: 0,
    periodFrom: "",
    periodTo: "",
    messages: zero,
    accounts: zero,
    overallScorePct: 0,
  };
}

export function parseStanding(raw: unknown): MemberTeamStanding {
  if (!raw || typeof raw !== "object") return emptyStanding();
  const data = raw as Record<string, unknown>;
  if (data.ok === false) {
    return { ...emptyStanding(), error: String(data.error ?? "unavailable") };
  }

  const readMetric = (key: string): StandingMetric => {
    const m = (data[key] ?? {}) as Record<string, unknown>;
    return {
      mine: Number(m.mine ?? 0),
      max: Number(m.max ?? 0),
      rank: Number(m.rank ?? 1),
      scorePct: Number(m.scorePct ?? 0),
      newThisWeek: Number(m.newThisWeek ?? 0),
    };
  };

  return {
    ok: true,
    teamSize: Number(data.teamSize ?? 0),
    periodFrom: String(data.periodFrom ?? ""),
    periodTo: String(data.periodTo ?? ""),
    messages: readMetric("messages"),
    accounts: readMetric("accounts"),
    overallScorePct: Number(data.overallScorePct ?? 0),
  };
}
