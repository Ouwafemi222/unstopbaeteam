import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.ABSTRACT_API_KEY;

export interface GeoLocation {
  ip: string;
  country: string;
  country_code: string;
  city: string;
  region: string;
  flag: string;
  currency: {
    currency_name: string;
    currency_code: string;
  } | null;
  timezone: {
    name: string;
    current_time: string;
  } | null;
}

// In-memory cache keyed by IP — expires after 24h
const cache = new Map<string, { data: GeoLocation; expiry: number }>();

export async function GET(req: NextRequest) {
  // Get IP from request headers (works on Vercel)
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = (forwarded ? forwarded.split(",")[0] : "").trim() || "detect";

  // Return cached
  const cached = cache.get(ip);
  if (cached && Date.now() < cached.expiry) {
    return NextResponse.json(cached.data);
  }

  if (!API_KEY) {
    return NextResponse.json({ error: "ABSTRACT_API_KEY not configured" }, { status: 500 });
  }

  try {
    // If ip is 'detect' or localhost, Abstract API will auto-detect from request IP
    const query = ip && ip !== "detect" && ip !== "127.0.0.1" && ip !== "::1"
      ? `&ip_address=${encodeURIComponent(ip)}`
      : "";

    const res = await fetch(
      `https://ipgeolocation.abstractapi.com/v1/?api_key=${API_KEY}${query}`,
      { next: { revalidate: 86400 } }
    );

    if (!res.ok) throw new Error(`Abstract API returned ${res.status}`);

    const json = await res.json();

    const location: GeoLocation = {
      ip: json.ip_address ?? ip,
      country: json.country ?? "Unknown",
      country_code: json.country_code ?? "",
      city: json.city ?? "",
      region: json.region ?? "",
      flag: json.flag?.emoji ?? "",
      currency: json.currency
        ? { currency_name: json.currency.currency_name, currency_code: json.currency.currency_code }
        : null,
      timezone: json.timezone
        ? { name: json.timezone.name, current_time: json.timezone.current_time }
        : null,
    };

    cache.set(ip, { data: location, expiry: Date.now() + 24 * 60 * 60 * 1000 });

    return NextResponse.json(location, {
      headers: { "Cache-Control": "private, max-age=86400" },
    });
  } catch (err) {
    console.error("Geo location fetch failed:", err);
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
