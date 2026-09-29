import type { GeoLocation } from "@/app/api/geo/location/route";

/** Map saved presence row to the shape used by LocationCard / geo API. */
export function presenceRowToGeoLocation(row: {
  city?: string | null;
  region?: string | null;
  country?: string | null;
  country_code?: string | null;
  flag?: string | null;
  currency_code?: string | null;
  timezone_name?: string | null;
}): GeoLocation | null {
  const country = row.country?.trim();
  if (!country) return null;
  return {
    ip: "",
    country,
    country_code: row.country_code ?? "",
    city: row.city ?? "",
    region: row.region ?? "",
    flag: row.flag ?? "",
    currency: row.currency_code
      ? { currency_name: row.currency_code, currency_code: row.currency_code }
      : null,
    timezone: row.timezone_name
      ? { name: row.timezone_name, current_time: "" }
      : null,
  };
}
