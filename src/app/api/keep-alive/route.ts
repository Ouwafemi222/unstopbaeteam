import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * External keep-alive for free-tier Supabase.
 * Free projects pause after ~1 week of inactivity.
 * Cron must run OUTSIDE Supabase (Vercel Cron) — a paused DB cannot wake itself.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    const url = new URL(request.url);
    const querySecret = url.searchParams.get("secret");
    const bearerOk = auth === `Bearer ${secret}`;
    const queryOk = querySecret === secret;
    if (!bearerOk && !queryOk) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: "Supabase env missing" }, { status: 500 });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Light DB round-trip so the project stays active
    const { error, count } = await supabase
      .from("countries")
      .select("id", { count: "exact", head: true });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message, at: new Date().toISOString() },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      service: "supabase-keep-alive",
      countries: count ?? null,
      at: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Keep-alive failed";
    return NextResponse.json(
      { ok: false, error: message, at: new Date().toISOString() },
      { status: 500 }
    );
  }
}
