/** Parse OCR text from a handwritten goals sheet into monthly plan fields. */

export interface ParsedGoalsSection {
  id: string;
  title: string;
  /** Where this section maps in the form */
  mapsTo: string;
  excerpt: string;
}

export interface ParsedGoalsFromOcr {
  goals: string;
  evaluation: string | null;
  income_goal: number | null;
  weekly_income_goal: number | null;
  accounts_daily_target: number | null;
  prospects_target: number | null;
  office_prospects_expected: number | null;
  contacts_expected: number | null;
  skills_to_learn: string | null;
  personal_pv_target: number | null;
  group_pv_target: number | null;
  neolife_team_structure: string | null;
  /** Sections detected for OCR review UI */
  sections: ParsedGoalsSection[];
}

type SectionKind =
  | "evaluation"
  | "goals"
  | "neolife"
  | "personal_money"
  | "prospect"
  | "team"
  | "learned"
  | "general";

interface RawSection {
  kind: SectionKind;
  title: string;
  lines: string[];
}

const HEADER_PATTERNS: { kind: SectionKind; title: string; pattern: RegExp }[] = [
  { kind: "evaluation", title: "Monthly evaluation", pattern: /^\s*evaluation\s+for\b/i },
  { kind: "goals", title: "Goals for the month", pattern: /^\s*(?:my\s+)?goals\s+for\b/i },
  { kind: "neolife", title: "NeoLife business", pattern: /^\s*neolife\b/i },
  { kind: "personal_money", title: "Personal — money making", pattern: /^\s*personal\s*[-–—]\s*money/i },
  { kind: "learned", title: "What you learned", pattern: /^\s*what\s+(?:i\s+)?learn/i },
  { kind: "prospect", title: "Prospecting", pattern: /^\s*prospect/i },
  { kind: "team", title: "Team withdrawals", pattern: /^\s*team\s+withdraw/i },
];

function normalizeLine(line: string): string {
  return line.replace(/\s+/g, " ").trim();
}

function splitRawSections(text: string): RawSection[] {
  const lines = text.split(/\n+/).map(normalizeLine).filter(Boolean);
  if (lines.length === 0) return [];

  const sections: RawSection[] = [];
  let current: RawSection = { kind: "general", title: "Other notes", lines: [] };

  for (const line of lines) {
    const header = HEADER_PATTERNS.find((h) => h.pattern.test(line));
    if (header) {
      if (current.lines.length > 0) sections.push(current);
      current = { kind: header.kind, title: header.title, lines: [line] };
    } else {
      current.lines.push(line);
    }
  }
  if (current.lines.length > 0) sections.push(current);
  return sections;
}

function sectionText(section: RawSection | undefined): string {
  if (!section) return "";
  return section.lines.join("\n").trim();
}

function sectionsText(sections: RawSection[], kinds: SectionKind[]): string {
  return sections
    .filter((s) => kinds.includes(s.kind))
    .map((s) => sectionText(s))
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

function firstNumber(text: string, patterns: RegExp[]): number | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const n = parseInt(match[1].replace(/,/g, ""), 10);
      if (!Number.isNaN(n)) return n;
    }
  }
  return null;
}

function firstMoney(text: string, patterns?: RegExp[]): number | null {
  const defaults = [
    /(?:want\s+to\s+make|make|earn|income|goal|target)[^\d$]{0,40}\$?\s*([\d,]+(?:\.\d{2})?)/i,
    /\$\s*([\d,]+(?:\.\d{2})?)/,
    /([\d,]+(?:\.\d{2})?)\s*(?:usd|dollars?)/i,
  ];
  for (const p of patterns ?? defaults) {
    const m = text.match(p);
    if (m?.[1]) {
      const n = parseFloat(m[1].replace(/,/g, ""));
      if (!Number.isNaN(n)) return n;
    }
  }
  return null;
}

function extractProspects(text: string): number | null {
  return firstNumber(text, [
    /prospect\s+(\d+)\s*people/i,
    /prospect[^\d]{0,15}(\d+)\s*people/i,
    /(\d+)\s*people[^\n]{0,40}(?:office|come)/i,
    /prospect[^\d]{0,20}(\d+)/i,
    /(\d+)\s*prospects?/i,
  ]);
}

function extractOfficeProspects(text: string): number | null {
  return firstNumber(text, [
    /(\d+)\s*people?\s*(?:come\s+to|to)\s*(?:the\s+)?office/i,
    /(\d+)\s*(?:come|visit|in)\s*(?:the\s+)?office/i,
    /office[^\d]{0,30}(\d+)/i,
    /(\d+)[^\n]{0,25}office/i,
  ]);
}

function extractContacts(text: string): number | null {
  return firstNumber(text, [
    /(\d+)\s*contacts?\s*(?:talking|talk)/i,
    /contacts?[^\d]{0,20}(\d+)/i,
    /(\d+)\s*contacts?/i,
  ]);
}

function extractAccountsDaily(text: string): number | null {
  return firstNumber(text, [
    /(\d+)\s*accounts?\s*(?:online|open|opened|every\s*day|daily|a\s*day)/i,
    /put\s+(\d+)\s*accounts?/i,
    /(\d+)\s*account\s*online/i,
  ]);
}

function extractWeeklyIncome(text: string): number | null {
  return firstMoney(text, [
    /\$?\s*([\d,]+(?:\.\d{2})?)\s*weekly/i,
    /weekly[^\d$]{0,20}\$?\s*([\d,]+(?:\.\d{2})?)/i,
  ]);
}

function extractPersonalPv(text: string): number | null {
  const personalPoint = firstNumber(text, [
    /personal\s*point[:\s-]*(\d+)\s*pv/i,
    /personal\s*pv[:\s-]*(\d+)/i,
  ]);
  if (personalPoint != null) return personalPoint;

  // Fallback: first "N PV" in NeoLife block that is not on a GPV/PPV summary line
  const lines = text.split(/\n+/);
  for (const line of lines) {
    if (/gpv|ppv\s*[->]/i.test(line)) continue;
    const m = line.match(/(\d+)\s*pv\b/i);
    if (m?.[1]) {
      const n = parseInt(m[1], 10);
      if (!Number.isNaN(n)) return n;
    }
  }
  return null;
}

function extractGroupPv(text: string): number | null {
  return firstNumber(text, [
    /gpv\s*[->:\s]+([\d,]+)/i,
    /group\s*pv[:\s-]*([\d,]+)/i,
  ]);
}

function extractSkillLines(lines: string[]): string | null {
  const skillLines = lines.filter((l) =>
    /learn|skill|training|agent|vision|improve|study|office/i.test(l)
  );
  return skillLines.length > 0 ? skillLines.join("\n") : null;
}

function buildGoalsNarrative(sections: RawSection[]): string {
  const goalsSection = sections.find((s) => s.kind === "goals");
  if (!goalsSection) {
    return sectionsText(sections, ["general"]).trim();
  }

  const activityLines = goalsSection.lines.filter((line) => {
    if (HEADER_PATTERNS.some((h) => h.pattern.test(line))) return false;
    if (/^\s*(?:my\s+)?goals\s+for\b/i.test(line)) return false;
    if (/want\s+to\s+make/i.test(line)) return false;
    if (/prospect\s+\d+/i.test(line) && /office/i.test(line)) return false;
    return /account|review|gig|online|daily|every\s*day|\$\d+/i.test(line);
  });

  return activityLines.join("\n").trim();
}

function buildEvaluationNarrative(sections: RawSection[]): string | null {
  const parts = [
    sectionsText(sections, ["evaluation", "personal_money", "learned", "prospect", "team"]),
  ].filter(Boolean);
  const text = parts.join("\n\n").trim();
  return text || null;
}

function buildNeolifeStructure(sections: RawSection[]): string | null {
  const neo = sections.find((s) => s.kind === "neolife");
  if (!neo) return null;

  const structureLines = neo.lines.filter((line) => {
    if (/^\s*neolife/i.test(line)) return false;
    if (/personal\s*point/i.test(line)) return false;
    if (/^\d+\s*pv$/i.test(line.trim())) return false;
    return true;
  });

  const text = structureLines.join("\n").trim();
  return text || null;
}

function buildSectionSummaries(sections: RawSection[]): ParsedGoalsSection[] {
  return sections.map((s, i) => {
    const excerpt = sectionText(s);
    const mapsTo = (() => {
      switch (s.kind) {
        case "evaluation":
        case "personal_money":
        case "learned":
        case "prospect":
        case "team":
          return "Monthly evaluation";
        case "goals":
          return "Written goals + personal targets";
        case "neolife":
          return "NeoLife PV & team structure";
        default:
          return "Written goals (review manually)";
      }
    })();
    return {
      id: `${s.kind}-${i}`,
      title: s.title,
      mapsTo,
      excerpt: excerpt.length > 180 ? `${excerpt.slice(0, 180)}…` : excerpt,
    };
  });
}

export function parseGoalsFromOcrText(rawText: string): ParsedGoalsFromOcr {
  const text = rawText.trim();
  const sections = splitRawSections(text);
  const goalsBlock = sectionsText(sections, ["goals"]) || text;
  const neolifeBlock = sectionsText(sections, ["neolife"]);
  const evalBlock = sectionsText(sections, [
    "evaluation",
    "personal_money",
    "learned",
    "prospect",
    "team",
  ]);

  const allGoalLines = sections.flatMap((s) => s.lines);

  return {
    goals: buildGoalsNarrative(sections) || goalsBlock,
    evaluation: buildEvaluationNarrative(sections),
    income_goal: firstMoney(goalsBlock) ?? firstMoney(text),
    weekly_income_goal: extractWeeklyIncome(goalsBlock) ?? extractWeeklyIncome(text),
    accounts_daily_target: extractAccountsDaily(goalsBlock) ?? extractAccountsDaily(text),
    prospects_target: extractProspects(goalsBlock) ?? extractProspects(text),
    office_prospects_expected:
      extractOfficeProspects(goalsBlock) ?? extractOfficeProspects(text),
    contacts_expected:
      extractContacts(evalBlock) ?? extractContacts(goalsBlock) ?? extractContacts(text),
    skills_to_learn: extractSkillLines(allGoalLines),
    personal_pv_target:
      extractPersonalPv(neolifeBlock) ??
      extractPersonalPv(goalsBlock) ??
      extractPersonalPv(text),
    group_pv_target:
      extractGroupPv(neolifeBlock) ?? extractGroupPv(goalsBlock) ?? extractGroupPv(text),
    neolife_team_structure: buildNeolifeStructure(sections),
    sections: buildSectionSummaries(sections),
  };
}
