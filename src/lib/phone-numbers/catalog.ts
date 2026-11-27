const NUMBERS_URL = "https://quackr.io/numbers.json";
const CACHE_MS = 10 * 60 * 1000;

export type PhoneCountry = {
  code: string;
  name: string;
  online: number;
};

type RawNumber = {
  locale?: string;
  status?: string;
  number?: string;
  added?: string;
};

const COUNTRY_NAMES: Record<string, string> = {
  am: "Armenia",
  at: "Austria",
  au: "Australia",
  be: "Belgium",
  br: "Brazil",
  ca: "Canada",
  ch: "Switzerland",
  cn: "China",
  de: "Germany",
  dk: "Denmark",
  es: "Spain",
  fi: "Finland",
  fr: "France",
  hu: "Hungary",
  id: "Indonesia",
  ie: "Ireland",
  il: "Israel",
  in: "India",
  it: "Italy",
  jp: "Japan",
  kr: "South Korea",
  lt: "Lithuania",
  lv: "Latvia",
  ma: "Morocco",
  mx: "Mexico",
  nl: "Netherlands",
  no: "Norway",
  pk: "Pakistan",
  pl: "Poland",
  pt: "Portugal",
  rs: "Serbia",
  ru: "Russia",
  se: "Sweden",
  si: "Slovenia",
  sw: "Switzerland",
  th: "Thailand",
  ua: "Ukraine",
  uk: "United Kingdom",
  us: "United States",
  za: "South Africa",
};

let cached: { at: number; rows: RawNumber[] } | null = null;

async function loadRows(): Promise<RawNumber[]> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.rows;
  const response = await fetch(NUMBERS_URL, { cache: "no-store" });
  if (!response.ok) throw new Error("The number list did not load");
  const rows = (await response.json()) as RawNumber[];
  cached = { at: Date.now(), rows: Array.isArray(rows) ? rows : [] };
  return cached.rows;
}

export function countryName(code: string) {
  return COUNTRY_NAMES[code] ?? code.toUpperCase();
}

export async function listCountries(): Promise<PhoneCountry[]> {
  const counts = new Map<string, number>();
  for (const row of await loadRows()) {
    if (row.status !== "Online" || !row.locale) continue;
    counts.set(row.locale, (counts.get(row.locale) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([code, online]) => ({ code, name: countryName(code), online }))
    .sort((a, b) => b.online - a.online || a.name.localeCompare(b.name));
}

export const NUMBERS_PAGE_SIZE = 12;

export async function findOnlineNumber(number: string) {
  const row = (await loadRows()).find(
    (item) => item.status === "Online" && String(item.number) === number
  );
  if (!row?.number) return null;
  return { number: String(row.number), added: String(row.added ?? "") };
}

export async function listNumbers(locale: string, query: string, page: number) {
  const needle = query.replace(/\D/g, "");
  const matches = (await loadRows())
    .filter((row) => row.status === "Online" && row.locale === locale && row.number)
    .sort((a, b) => Number(b.added ?? 0) - Number(a.added ?? 0));
  const filtered = needle ? matches.filter((row) => String(row.number).includes(needle)) : matches;
  const pages = Math.max(1, Math.ceil(filtered.length / NUMBERS_PAGE_SIZE));
  const safePage = Math.min(Math.max(1, Math.floor(page) || 1), pages);
  const start = (safePage - 1) * NUMBERS_PAGE_SIZE;
  return {
    numbers: filtered.slice(start, start + NUMBERS_PAGE_SIZE).map((row) => ({
      number: String(row.number).replace(/\D/g, ""),
      added: String(row.added ?? ""),
    })),
    page: safePage,
    pages,
    total: filtered.length,
  };
}
