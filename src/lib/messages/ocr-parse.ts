export interface MessageOcrReadout {
  date: string | null;
  time: string | null;
  buyer: string | null;
  gig: string | null;
  text: string;
}

const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function iso(year: number, month: number, day: number) {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${pad(month)}-${pad(day)}`;
}

function lagosToday(now: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function shiftIso(day: string, delta: number) {
  const [year, month, date] = day.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, date));
  next.setUTCDate(next.getUTCDate() + delta);
  return next.toISOString().slice(0, 10);
}

function findDate(text: string, now: Date): string | null {
  const today = lagosToday(now);
  if (/\btoday\b/i.test(text)) return today;
  if (/\byesterday\b/i.test(text)) return shiftIso(today, -1);

  const yearFirst = text.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (yearFirst) return iso(Number(yearFirst[1]), Number(yearFirst[2]), Number(yearFirst[3]));

  const monthName = text.match(
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,)?\s*(20\d{2})?\b/i
  );
  if (monthName) {
    const month = MONTHS[monthName[1].toLowerCase().replace(".", "")];
    const year = monthName[3] ? Number(monthName[3]) : Number(today.slice(0, 4));
    return iso(year, month, Number(monthName[2]));
  }

  const dayFirstName = text.match(
    /\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s*(20\d{2})?\b/i
  );
  if (dayFirstName) {
    const month = MONTHS[dayFirstName[2].toLowerCase().replace(".", "")];
    const year = dayFirstName[3] ? Number(dayFirstName[3]) : Number(today.slice(0, 4));
    return iso(year, month, Number(dayFirstName[1]));
  }

  const numeric = text.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})\b/);
  if (numeric) {
    const first = Number(numeric[1]);
    const second = Number(numeric[2]);
    const year = Number(numeric[3]);
    if (first > 12) return iso(year, second, first);
    if (second > 12) return iso(year, first, second);
    return iso(year, second, first);
  }

  return null;
}

function findTime(text: string) {
  const match = text.match(/\b(\d{1,2}:\d{2}\s*(?:am|pm)?)\b/i);
  return match ? match[1].replace(/\s+/g, " ").trim() : null;
}

function findBuyer(lines: string[]) {
  for (const line of lines) {
    const from = line.match(/^(?:from|buyer|client)\s*[:\-]?\s+(.{2,40})$/i);
    if (from) return from[1].trim();
  }
  for (const line of lines.slice(0, 8)) {
    if (/\d|today|yesterday|inbox|fiverr|message|online|delivered/i.test(line)) continue;
    const words = line.split(/\s+/);
    if (words.length < 1 || words.length > 4) continue;
    if (words.every((word) => /^[A-Z][A-Za-z'.-]{1,20}$/.test(word))) return line;
  }
  return null;
}

function findGig(lines: string[], buyer: string | null) {
  for (const line of lines) {
    const labeled = line.match(/^(?:gig|order|service)\s*[:\-]\s*(.{3,80})$/i);
    if (labeled) return labeled[1].trim();
  }
  const sentence = lines.find(
    (line) => line !== buyer && line.length >= 12 && line.length <= 90 && !/\b(today|yesterday)\b/i.test(line)
  );
  return sentence ?? null;
}

export function parseMessageOcr(rawText: string, now = new Date()): MessageOcrReadout {
  const text = rawText.replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").trim();
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const buyer = findBuyer(lines);
  return {
    date: findDate(text, now),
    time: findTime(text),
    buyer,
    gig: findGig(lines, buyer),
    text: text.slice(0, 4000),
  };
}
