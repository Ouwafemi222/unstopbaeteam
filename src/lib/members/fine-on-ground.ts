import { normalizeMemberName, toRegistrationKey } from "@/data/forecast-members";

export interface FineMatchCandidate {
  teamMemberId: string;
  memberName: string;
  accountId?: string | null;
  accountUsername?: string | null;
  matchLabel: string;
}

export interface FineMatchResult {
  inputName: string;
  matched: boolean;
  candidate: FineMatchCandidate | null;
}

function normalizeLoose(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/^(mr|mrs|miss|ms)\.?\s+/i, "")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Match an uploaded name/username to a team member who owns Fiverr accounts.
 * Prefer exact member name, then preferred name, then Fiverr username/display name.
 */
export function matchFineOnGroundName(
  input: string,
  members: { id: string; full_name: string; preferred_name?: string | null }[],
  accounts: {
    id: string;
    team_member_id: string;
    username: string;
    display_name?: string | null;
  }[]
): FineMatchResult {
  const raw = input.trim();
  if (!raw) {
    return { inputName: raw, matched: false, candidate: null };
  }

  const normalized = normalizeMemberName(raw);
  const key = toRegistrationKey(raw);
  const loose = normalizeLoose(raw);
  const rawLower = raw.toLowerCase();

  // 1) Exact / normalized team member name
  for (const m of members) {
    if (
      toRegistrationKey(m.full_name) === key ||
      normalizeMemberName(m.full_name) === normalized ||
      normalizeLoose(m.full_name) === loose
    ) {
      return {
        inputName: raw,
        matched: true,
        candidate: {
          teamMemberId: m.id,
          memberName: m.full_name,
          matchLabel: `Owner: ${m.full_name}`,
        },
      };
    }
    if (m.preferred_name && normalizeLoose(m.preferred_name) === loose) {
      return {
        inputName: raw,
        matched: true,
        candidate: {
          teamMemberId: m.id,
          memberName: m.full_name,
          matchLabel: `Owner: ${m.full_name} (preferred name)`,
        },
      };
    }
  }

  // 2) Fiverr username / display name → account owner
  const usernameKey = raw.replace(/^@/, "").toLowerCase();
  for (const acc of accounts) {
    if (
      acc.username.toLowerCase() === usernameKey ||
      (acc.display_name && normalizeLoose(acc.display_name) === loose)
    ) {
      const owner = members.find((m) => m.id === acc.team_member_id);
      if (!owner) continue;
      return {
        inputName: raw,
        matched: true,
        candidate: {
          teamMemberId: owner.id,
          memberName: owner.full_name,
          accountId: acc.id,
          accountUsername: acc.username,
          matchLabel: `Account @${acc.username} → owner ${owner.full_name}`,
        },
      };
    }
  }

  // 3) Partial first-name match only if unique among members
  const firstHits = members.filter((m) => {
    const parts = m.full_name.split(/\s+/);
    const first = parts[parts.length - 1] ?? "";
    return normalizeLoose(first) === loose || first.toLowerCase() === rawLower;
  });
  if (firstHits.length === 1) {
    const m = firstHits[0];
    return {
      inputName: raw,
      matched: true,
      candidate: {
        teamMemberId: m.id,
        memberName: m.full_name,
        matchLabel: `Owner: ${m.full_name} (name match)`,
      },
    };
  }

  return { inputName: raw, matched: false, candidate: null };
}

export function parseFineOnGroundLines(text: string): string[] {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const line of text.split(/\r?\n|,|;|\t/)) {
    const trimmed = line.trim().replace(/^[-•*]\s*/, "");
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    lines.push(trimmed);
  }
  return lines;
}
