import type { ForecastAccountRow } from "@/data/forecast-accounts";
import type { ForecastMessageRow } from "@/data/forecast-messages";
import { normalizeMemberName } from "@/data/forecast-members";
import type { OcrSheetType } from "@/lib/forecast/ocr-types";

const EMAIL_RE = /[a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
const PHONE_RE = /\b[\d\s\-()]{8,20}\b/g;
const MEMBER_RE = /\b(Mr|Miss|Mrs|Ms)\.?\s+[A-Za-z]+/gi;
const ISO_DATE_RE = /\b(20\d{2})-(\d{2})-(\d{2})\b/;
const SLASH_DATE_RE = /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})\b/;

type CountryCode = ForecastAccountRow["country"];

function parseDate(raw: string): string | null {
  const iso = raw.match(ISO_DATE_RE);
  if (iso) return iso[0];

  const slash = raw.match(SLASH_DATE_RE);
  if (!slash) return null;

  let [, d, m, y] = slash;
  if (y.length === 2) y = `20${y}`;
  const day = d.padStart(2, "0");
  const month = m.padStart(2, "0");
  return `${y}-${month}-${day}`;
}

function inferCountry(text: string, phone: string): CountryCode {
  const upper = text.toUpperCase();
  if (/\bNG\b|Nigeria/i.test(upper)) return "NG";
  if (/\bDE\b|Germany/i.test(upper)) return "DE";
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("1") && digits.length >= 10) return "US";
  if (digits.startsWith("44") || digits.startsWith("07")) return "GB";
  if (digits.startsWith("234")) return "NG";
  if (/\bUS\b|United States/i.test(upper)) return "US";
  if (/\bGB\b|UK|United Kingdom/i.test(upper)) return "GB";
  return "GB";
}

function cleanPhone(raw: string): string {
  return raw.replace(/[^\d+]/g, "").replace(/^\+/, "") || raw.trim();
}

function findMemberNear(lines: string[], index: number): string | null {
  for (let i = index; i >= Math.max(0, index - 3); i--) {
    const match = lines[i].match(MEMBER_RE);
    if (match?.[0]) return normalizeMemberName(match[0]);
  }
  for (let i = index; i <= Math.min(lines.length - 1, index + 2); i++) {
    const match = lines[i].match(MEMBER_RE);
    if (match?.[0]) return normalizeMemberName(match[0]);
  }
  return null;
}

export function parseAccountSheetText(text: string): ForecastAccountRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const rows: ForecastAccountRow[] = [];
  const seenEmails = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const emails = line.match(EMAIL_RE);
    if (!emails) continue;

    for (const email of emails) {
      const key = email.toLowerCase();
      if (seenEmails.has(key)) continue;
      seenEmails.add(key);

      const context = [lines[i - 1], line, lines[i + 1]].filter(Boolean).join(" ");
      const phoneMatch = context.match(PHONE_RE);
      const phone = phoneMatch ? cleanPhone(phoneMatch[0]) : "";
      const opening_date = parseDate(context) ?? "2026-01-01";
      const member = findMemberNear(lines, i) ?? "Mr Unknown";

      if (!phone) continue;

      rows.push({
        member,
        email: key,
        phone,
        country: inferCountry(context, phone),
        opening_date,
      });
    }
  }

  return rows;
}

export function parseMessageSheetText(text: string): ForecastMessageRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const rows: ForecastMessageRow[] = [];
  let lastMember = "";

  for (const line of lines) {
    const memberMatches = line.match(MEMBER_RE);
    if (memberMatches?.[0]) {
      lastMember = normalizeMemberName(memberMatches[0]);
    }

    const date = parseDate(line);
    if (!date || !lastMember) continue;

    let service = line
      .replace(MEMBER_RE, "")
      .replace(ISO_DATE_RE, "")
      .replace(SLASH_DATE_RE, "")
      .replace(/\b\d+\b/g, " ")
      .replace(/[|\t]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (service.length < 2) {
      service = line.split(/\s{2,}|\t|\|/).pop()?.trim() ?? "";
    }

    if (service.length < 2) continue;

    const countMatch = line.match(/\bx\s*(\d+)\b/i) ?? line.match(/\((\d+)\)/);
    const count = countMatch ? Number(countMatch[1]) : 1;

    rows.push({
      member: lastMember,
      received_date: date,
      service: service.slice(0, 120),
      count: count > 0 ? count : 1,
    });
  }

  return rows;
}

export function parseSheetText(text: string, sheetType: OcrSheetType) {
  const cleaned = text.replace(/\f/g, "\n").trim();
  if (!cleaned) {
    return { rows: [], notes: "OCR returned no readable text. Try a clearer photo with good lighting." };
  }

  const rows =
    sheetType === "accounts"
      ? parseAccountSheetText(cleaned)
      : parseMessageSheetText(cleaned);

  const notes =
    rows.length === 0
      ? "Text was detected but no structured rows could be parsed. Use the table below to add rows manually."
      : undefined;

  return { rows, notes, rawText: cleaned.slice(0, 2000) };
}
