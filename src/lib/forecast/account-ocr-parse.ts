export interface ParsedAccountFromOcr {
  display_name: string | null;
  username: string | null;
  email: string | null;
  phone: string | null;
  country_code: string | null;
  country_name: string | null;
  opening_date: string | null;
  opening_time: string | null;
  secret_question: string | null;
  secret_answer: string | null;
  info_supplied_by: string | null;
  notes: string | null;
  verification_code: string | null;
  rate_amount: number | null;
  rate_currency: string | null;
}

/** Max accounts accepted from one OCR photo. */
export const MAX_ACCOUNTS_PER_OCR = 20;

const EMAIL_RE = /[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i;
const PHONE_RE = /(?:\+?\d[\d\s\-()]{7,}\d)/;
const TIME_RE = /\b([01]?\d|2[0-3]):([0-5]\d)\b/;
const ISO_DATE_RE = /\b(20\d{2})-(\d{2})-(\d{2})\b/;
const SLASH_DATE_RE = /\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b/;
const CODE_RE = /\b(?:code|otp|verification)[:\s]*(\d{4})\b/i;
const RATE_RE = /(?:rate|\$|£|₦)\s*([\d]+(?:\.\d{1,2})?)/i;

function valueAfterLabel(text: string, labels: string[]): string | null {
  for (const label of labels) {
    const re = new RegExp(`${label}\\s*[:\\-]?\\s*(.+)$`, "im");
    const m = text.match(re);
    if (m?.[1]) {
      const v = m[1].split(/\n/)[0].trim();
      if (v) return v.replace(/^[@#]/, "").trim();
    }
  }
  return null;
}

function parseDate(raw: string): string | null {
  const iso = raw.match(ISO_DATE_RE);
  if (iso) return iso[0];
  const slash = raw.match(SLASH_DATE_RE);
  if (!slash) return null;
  let [, d, m, y] = slash;
  if (y.length === 2) y = `20${y}`;
  let day = d;
  let month = m;
  if (parseInt(d, 10) > 12 && parseInt(m, 10) <= 12) {
    day = d;
    month = m;
  } else if (parseInt(m, 10) > 12 && parseInt(d, 10) <= 12) {
    day = m;
    month = d;
  }
  return `${y}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function inferCountry(text: string, phone: string | null): { code: string | null; name: string | null } {
  const upper = text;
  if (/\bNigeria\b|\bNG\b/i.test(upper) || phone?.startsWith("234") || phone?.startsWith("+234")) {
    return { code: "NG", name: "Nigeria" };
  }
  if (/\bUnited Kingdom\b|\bUK\b|\bGB\b|\bBritain\b/i.test(upper) || phone?.startsWith("44") || phone?.startsWith("07")) {
    return { code: "GB", name: "United Kingdom" };
  }
  if (/\bUnited States\b|\bUSA\b|\bUS\b/i.test(upper) || (phone?.startsWith("1") && (phone?.length ?? 0) >= 10)) {
    return { code: "US", name: "United States" };
  }
  if (/\bGermany\b|\bDE\b/i.test(upper)) return { code: "DE", name: "Germany" };
  if (/\bCanada\b|\bCA\b/i.test(upper)) return { code: "CA", name: "Canada" };
  const labeled = valueAfterLabel(text, ["country", "nation"]);
  if (labeled) return { code: null, name: labeled };
  return { code: null, name: null };
}

function cleanPhone(raw: string): string {
  return raw.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
}

function usernameFromEmail(email: string | null): string | null {
  if (!email) return null;
  const local = email.split("@")[0]?.replace(/[^a-zA-Z0-9._-]/g, "") ?? "";
  if (local.length < 3) return null;
  return local.slice(0, 30);
}

function isUsefulAccount(row: ParsedAccountFromOcr): boolean {
  return Boolean(row.email || row.username || row.phone);
}

function accountKey(row: ParsedAccountFromOcr): string {
  if (row.email) return `e:${row.email.toLowerCase()}`;
  if (row.username) return `u:${row.username.toLowerCase()}`;
  if (row.phone) return `p:${row.phone}`;
  return `n:${row.display_name ?? Math.random()}`;
}

/**
 * Parse a single handwritten / typed Fiverr account slip into form fields.
 */
export function parseAccountFromOcrText(text: string): ParsedAccountFromOcr {
  const normalized = text.replace(/\r/g, "\n");

  const emailLabeled = valueAfterLabel(normalized, ["email", "gmail", "account email", "mail"]);
  const email =
    (emailLabeled?.match(EMAIL_RE)?.[0] ?? null) ||
    normalized.match(EMAIL_RE)?.[0] ||
    null;

  const phoneRaw =
    valueAfterLabel(normalized, ["phone", "phone number", "mobile", "tel", "telephone"]) ??
    normalized.match(PHONE_RE)?.[0] ??
    null;
  const phone = phoneRaw ? cleanPhone(phoneRaw) : null;

  const usernameLabeled = valueAfterLabel(normalized, [
    "username",
    "fiverr username",
    "user name",
    "handle",
  ]);
  let username = usernameLabeled?.replace(/^@/, "") ?? null;
  if (username && username.includes("@")) username = null;
  if (username && email && username.toLowerCase() === email.toLowerCase()) username = null;
  // Avoid treating "@domain" from an email address as a Fiverr username
  if (!username) {
    const atUser = normalized.match(/(?:^|[\s:(])@([a-zA-Z0-9._-]{3,30})\b/);
    const candidate = atUser?.[1] ?? null;
    if (candidate && (!email || !email.toLowerCase().includes(`@${candidate.toLowerCase()}`))) {
      username = candidate;
    }
  }
  if (!username) username = usernameFromEmail(email);

  const display_name =
    valueAfterLabel(normalized, [
      "display name",
      "fiverr name",
      "account name",
      "full name",
      "name",
    ]) ?? null;

  const secret_question =
    valueAfterLabel(normalized, [
      "secret question",
      "security question",
      "question",
      "sq",
    ]) ?? null;

  const secret_answer =
    valueAfterLabel(normalized, [
      "secret answer",
      "security answer",
      "answer",
      "sa",
    ]) ?? null;

  const info_supplied_by =
    valueAfterLabel(normalized, ["info supplied by", "supplied by", "opened by", "by"]) ?? null;

  const notes =
    valueAfterLabel(normalized, ["notes", "note", "remark", "comments"]) ?? null;

  const openingDateRaw =
    valueAfterLabel(normalized, ["opening date", "date opened", "date", "opened"]) ??
    normalized;
  const opening_date = parseDate(openingDateRaw);

  const timeLabeled = valueAfterLabel(normalized, ["opening time", "time"]);
  const opening_time =
    (timeLabeled?.match(TIME_RE)?.[0] ?? normalized.match(TIME_RE)?.[0] ?? null)?.padStart(5, "0") ??
    null;

  const verification_code =
    valueAfterLabel(normalized, ["verification code", "code", "otp"])?.match(/\d{4}/)?.[0] ??
    normalized.match(CODE_RE)?.[1] ??
    null;

  const rateLabeled = valueAfterLabel(normalized, ["rate", "rate amount", "price"]);
  const rateMatch = (rateLabeled ?? normalized).match(RATE_RE);
  const rate_amount = rateMatch ? parseFloat(rateMatch[1]) : null;

  let rate_currency: string | null = null;
  if (/₦|NGN|naira/i.test(normalized)) rate_currency = "NGN";
  else if (/£|GBP/i.test(normalized)) rate_currency = "GBP";
  else if (/€|EUR/i.test(normalized)) rate_currency = "EUR";
  else if (/\$|USD/i.test(normalized)) rate_currency = "USD";

  const country = inferCountry(normalized, phone);

  return {
    display_name,
    username,
    email,
    phone,
    country_code: country.code,
    country_name: country.name,
    opening_date,
    opening_time,
    secret_question,
    secret_answer,
    info_supplied_by,
    notes,
    verification_code,
    rate_amount: Number.isFinite(rate_amount) ? rate_amount : null,
    rate_currency,
  };
}

function splitIntoAccountBlocks(text: string): string[] {
  const normalized = text.replace(/\r/g, "\n").replace(/\f/g, "\n").trim();
  if (!normalized) return [];

  const bySeparator = normalized
    .split(
      /\n\s*\n+|(?=^\s*(?:account\s*#?\d+|acc(?:ount)?\s*\d+|\d{1,2}[\).:-]\s))/gim
    )
    .map((b) => b.trim())
    .filter((b) => b.length > 8);

  if (bySeparator.length > 1) return bySeparator;

  const lines = normalized.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const blocks: string[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const emails = lines[i].match(/[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi);
    if (!emails) continue;
    for (const email of emails) {
      const key = email.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const slice = lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 4)).join("\n");
      blocks.push(slice);
    }
  }

  if (blocks.length > 0) return blocks;
  return [normalized];
}

/**
 * Parse a full page / sheet that may list many accounts (up to max).
 */
export function parseAccountsFromOcrText(
  text: string,
  max = MAX_ACCOUNTS_PER_OCR
): ParsedAccountFromOcr[] {
  const blocks = splitIntoAccountBlocks(text);
  const rows: ParsedAccountFromOcr[] = [];
  const seen = new Set<string>();

  for (const block of blocks) {
    if (rows.length >= max) break;
    const parsed = parseAccountFromOcrText(block);
    if (!isUsefulAccount(parsed)) continue;
    const key = accountKey(parsed);
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(parsed);
  }

  if (rows.length <= 1) {
    const emails = [
      ...new Set(
        (text.match(/[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi) ?? []).map((e) =>
          e.toLowerCase()
        )
      ),
    ];
    if (emails.length > 1) {
      const rebuilt: ParsedAccountFromOcr[] = [];
      const lines = text.replace(/\r/g, "\n").split(/\n/).map((l) => l.trim()).filter(Boolean);
      const rebuiltSeen = new Set<string>();
      for (const email of emails) {
        if (rebuilt.length >= max) break;
        const idx = lines.findIndex((l) => l.toLowerCase().includes(email));
        const context =
          idx >= 0
            ? lines.slice(Math.max(0, idx - 2), Math.min(lines.length, idx + 4)).join("\n")
            : email;
        const parsed = parseAccountFromOcrText(context);
        if (!parsed.email) parsed.email = email;
        if (!parsed.username) parsed.username = usernameFromEmail(email);
        if (!isUsefulAccount(parsed)) continue;
        const key = accountKey(parsed);
        if (rebuiltSeen.has(key)) continue;
        rebuiltSeen.add(key);
        rebuilt.push(parsed);
      }
      if (rebuilt.length > rows.length) return rebuilt.slice(0, max);
    }
  }

  return rows.slice(0, max);
}
