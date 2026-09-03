import { NextResponse } from "next/server";

const API_KEY = process.env.EXCHANGE_RATE_API_KEY;
const BASE_URL = "https://v6.exchangerate-api.com/v6";

// Cache rates in-memory for 1 hour — saves quota (1,500/mo free)
let cachedRates: ExchangeRates | null = null;
let cacheExpiry = 0;

export interface ExchangeRates {
  base: string;
  rates: Record<string, number>;
  fetched_at: string;
  next_update: string;
}

export async function GET() {
  // Return cached rates if still fresh
  if (cachedRates && Date.now() < cacheExpiry) {
    return NextResponse.json(cachedRates, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" },
    });
  }

  if (!API_KEY) {
    return NextResponse.json({ error: "EXCHANGE_RATE_API_KEY not configured" }, { status: 500 });
  }

  try {
    const res = await fetch(`${BASE_URL}/${API_KEY}/latest/GBP`, {
      next: { revalidate: 3600 }, // Next.js fetch cache 1h
    });

    if (!res.ok) {
      throw new Error(`ExchangeRate-API returned ${res.status}`);
    }

    const json = await res.json();

    if (json.result !== "success") {
      throw new Error(json["error-type"] ?? "Unknown API error");
    }

    const rates: ExchangeRates = {
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

    cachedRates = rates;
    cacheExpiry = Date.now() + 60 * 60 * 1000; // 1 hour

    return NextResponse.json(rates, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200" },
    });
  } catch (err) {
    console.error("Currency rate fetch failed:", err);
    // Return stale cache if available rather than error
    if (cachedRates) {
      return NextResponse.json({ ...cachedRates, stale: true });
    }
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
