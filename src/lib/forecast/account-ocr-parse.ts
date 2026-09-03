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

const EMAIL_RE = /[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i;
const PHONE_RE = /(?:\+?\d[\d\s\-()]{7,}\d)/;
const USERNAME_RE = /(?:@|username[:\s]*)([a-zA-Z0-9._-]{3,30})/i;
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
  // Prefer day-first (NG/UK style) when day > 12
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

/**
 * Parse a single handwritten / typed Fiverr account slip into form fields.
 */
export function parseAccountFromOcrText(text: string): ParsedAccountFromOcr {
  const normalized = text.replace(/\r/g, "\n");

  const email =
    valueAfterLabel(normalized, ["email", "gmail", "account email", "mail"]) ??
    normalized.match(EMAIL_RE)?.[0] ??
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
  const usernameFromAt = normalized.match(USERNAME_RE)?.[1] ?? null;
  let username = usernameLabeled?.replace(/^@/, "") ?? usernameFromAt;
  if (username && email && username.toLowerCase() === email.toLowerCase()) username = null;
  if (username && username.includes("@")) username = null;

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
