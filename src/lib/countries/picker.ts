import type { Country } from "@/types/database";

/** Shown first when not filtering — team’s most-used Fiverr account countries. */
export const PINNED_COUNTRY_CODES = ["NG", "GB", "US", "CA", "IN", "PK", "PH"] as const;

export function countryPickerLabel(country: Country): string {
  if (country.code === "GB") return "United Kingdom (UK)";
  return country.name;
}

export function sortCountriesForPicker(countries: Country[]): Country[] {
  const pinned: Country[] = [];
  for (const code of PINNED_COUNTRY_CODES) {
    const row = countries.find((c) => c.code.toUpperCase() === code);
    if (row) pinned.push(row);
  }
  const pinnedIds = new Set(pinned.map((c) => c.id));
  const rest = countries
    .filter((c) => !pinnedIds.has(c.id))
    .sort((a, b) => a.name.localeCompare(b.name));
  return [...pinned, ...rest];
}

/** Match OCR / free-text country hints to a row (UK → GB, etc.). */
export function matchCountryFromHint(
  countries: Country[],
  code?: string | null,
  name?: string | null
): Country | undefined {
  const c = code?.trim().toUpperCase();
  const n = name?.trim().toLowerCase();

  if (c === "UK") {
    return countries.find((row) => row.code.toUpperCase() === "GB");
  }
  if (c) {
    const byCode = countries.find((row) => row.code.toUpperCase() === c);
    if (byCode) return byCode;
  }
  if (n) {
    if (n === "uk" || n === "u.k." || n === "britain" || n === "great britain") {
      return countries.find((row) => row.code.toUpperCase() === "GB");
    }
    const exact = countries.find((row) => row.name.toLowerCase() === n);
    if (exact) return exact;
    return countries.find((row) => row.name.toLowerCase().includes(n));
  }
  return undefined;
}

export function filterCountries(countries: Country[], query: string): Country[] {
  const q = query.trim().toLowerCase();
  if (!q) return sortCountriesForPicker(countries);
  return countries.filter((c) => {
    const label = countryPickerLabel(c).toLowerCase();
    return (
      label.includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      (c.code === "GB" && (q === "uk" || q === "u.k" || q.includes("united kingdom")))
    );
  });
}
