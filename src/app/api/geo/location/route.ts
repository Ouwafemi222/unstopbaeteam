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

function isPublicIp(ip: string) {
  if (!ip || ip === "detect") return false;
  if (ip === "127.0.0.1" || ip === "::1" || ip === "0.0.0.0") return false;
  if (ip.startsWith("10.")) return false;
  if (ip.startsWith("192.168.")) return false;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return false;
  if (ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80")) return false;
  return true;
}

function visitorIp(req: NextRequest): string | null {
  const raw =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip")?.trim() ||
    req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    "";
  return isPublicIp(raw) ? raw : null;
}

function parseAbstract(json: Record<string, unknown>, fallbackIp: string): GeoLocation | null {
  const loc = (json.location as Record<string, unknown> | undefined) ?? json;
  const country = String(loc.country ?? json.country ?? "");
  if (!country) return null;

  const currency = json.currency as Record<string, string> | undefined;
  const timezone = json.timezone as Record<string, string> | undefined;
  const flag = json.flag as Record<string, string> | undefined;

  return {
    ip: String(json.ip_address ?? fallbackIp),
    country,
    country_code: String(loc.country_code ?? json.country_code ?? ""),
    city: String(loc.city ?? json.city ?? ""),
    region: String(loc.region ?? json.region ?? ""),
    flag: flag?.emoji ?? "",
    currency: currency
      ? {
          currency_name: currency.name ?? currency.currency_name ?? "",
          currency_code: currency.code ?? currency.currency_code ?? "",
        }
      : null,
    timezone: timezone
      ? {
          name: timezone.name ?? "",
          current_time: timezone.local_time ?? timezone.current_time ?? "",
        }
      : null,
  };
}

export async function GET(req: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json({ error: "ABSTRACT_API_KEY not configured" }, { status: 500 });
  }

  const ip = visitorIp(req);
  const query = ip ? `&ip_address=${encodeURIComponent(ip)}` : "";

  try {
    // This key is for IP Intelligence (not IP Geolocation)
    const res = await fetch(
      `https://ip-intelligence.abstractapi.com/v1/?api_key=${API_KEY}${query}`,
      { cache: "no-store" }
    );

    const json = (await res.json()) as Record<string, unknown>;
    if (!res.ok || json.error) {
      const err = json.error as { message?: string } | undefined;
      throw new Error(err?.message ?? `Abstract API returned ${res.status}`);
    }

    const location = parseAbstract(json, ip ?? "unknown");
    if (!location) {
      return NextResponse.json({ error: "No location data for this IP" }, { status: 404 });
    }

    return NextResponse.json(location, {
      headers: { "Cache-Control": "private, max-age=3600" },
    });
  } catch (err) {
    console.error("Geo location fetch failed:", err);
    return NextResponse.json({ error: String(err) }, { status: 502 });
  }
}
