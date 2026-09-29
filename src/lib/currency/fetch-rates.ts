import type { ExchangeRates } from "@/app/api/currency/rates/route";

/** Server-side GBP base rates for dashboard widgets (same source as /api/currency/rates). */
export async function fetchExchangeRates(): Promise<ExchangeRates | null> {
  const key = process.env.EXCHANGE_RATE_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`https://v6.exchangerate-api.com/v6/${key}/latest/GBP`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.result !== "success") return null;
    return {
      base: "GBP",
      rates: {
        NGN: json.conversion_rates.NGN,
        USD: json.conversion_rates.USD,
        EUR: json.conversion_rates.EUR,
        GBP: 1,
      },
      fetched_at: new Date().toISOString(),
      next_update: json.time_next_update_utc,
    };
  } catch {
    return null;
  }
}
