import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RawMessage = {
  sender?: string;
  message?: string;
  text?: string;
  body?: string;
  timestamp?: number | string;
};

function receivedLabel(timestamp: unknown) {
  const value = Number(timestamp);
  if (!Number.isFinite(value) || value <= 0) return "";
  const ms = value < 1e12 ? value * 1000 : value;
  return new Date(ms).toLocaleString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    month: "short",
    timeZone: "Africa/Lagos",
  });
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const number = (new URL(request.url).searchParams.get("number") || "").replace(/\D/g, "");
  if (number.length < 6 || number.length > 15) {
    return NextResponse.json({ error: "Pick a number" }, { status: 400 });
  }

  const token = request.headers.get("x-turnstile-token");
  const headers: Record<string, string> = {
    Accept: "application/json",
    Referer: "https://quackr.io/",
  };
  if (token) headers["x-turnstile-token"] = token;

  try {
    const upstream = await fetch(
      `https://quackr.io/api/messages/${number}?limit=20&timeFilter=86400000`,
      { headers, cache: "no-store" }
    );
    const body = (await upstream.json().catch(() => null)) as
      | RawMessage[]
      | { messages?: RawMessage[]; error?: string }
      | null;
    const failed = !upstream.ok || (!Array.isArray(body) && Boolean(body?.error));
    if (failed) return NextResponse.json({ messages: [], waiting: true, ok: false });
    const rows = Array.isArray(body) ? body : body?.messages ?? [];
    const messages = rows.map((row) => ({
      sender: String(row.sender || "Text").replaceAll("*", ""),
      message: String(row.message || row.text || row.body || ""),
      received: receivedLabel(row.timestamp),
    }));
    return NextResponse.json({ messages, waiting: messages.length === 0, ok: true });
  } catch {
    return NextResponse.json({ messages: [], waiting: true, ok: false });
  }
}
