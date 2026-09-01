/** Parse OCR text from a handwritten goals sheet into monthly plan fields. */
export interface ParsedGoalsFromOcr {
  goals: string;
  income_goal: number | null;
  prospects_target: number | null;
  office_prospects_expected: number | null;
  contacts_expected: number | null;
  skills_to_learn: string | null;
}

function firstNumberAfter(text: string, patterns: RegExp[]): number | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const n = parseInt(match[1].replace(/,/g, ""), 10);
      if (!Number.isNaN(n)) return n;
    }
  }
  return null;
}

function firstMoney(text: string): number | null {
  const patterns = [
    /(?:income|earn|make|goal|target|want)[^\d]{0,30}\$?\s*([\d,]+(?:\.\d{2})?)/i,
    /\$\s*([\d,]+(?:\.\d{2})?)/,
    /([\d,]+(?:\.\d{2})?)\s*(?:usd|dollars?)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) {
      const n = parseFloat(m[1].replace(/,/g, ""));
      if (!Number.isNaN(n)) return n;
    }
  }
  return null;
}

export function parseGoalsFromOcrText(rawText: string): ParsedGoalsFromOcr {
  const text = rawText.trim();
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);

  const skillsLines = lines.filter((l) =>
    /learn|skill|training|office|improve|study/i.test(l)
  );

  return {
    goals: text,
    income_goal: firstMoney(text),
    prospects_target: firstNumberAfter(text, [
      /prospects?[^\d]{0,20}(\d+)/i,
      /(\d+)\s*prospects?/i,
    ]),
    office_prospects_expected: firstNumberAfter(text, [
      /office[^\d]{0,30}(\d+)/i,
      /(\d+)[^\n]{0,20}office/i,
    ]),
    contacts_expected: firstNumberAfter(text, [
      /contacts?[^\d]{0,20}(\d+)/i,
      /(\d+)\s*contacts?/i,
    ]),
    skills_to_learn: skillsLines.length > 0 ? skillsLines.join("\n") : null,
  };
}
