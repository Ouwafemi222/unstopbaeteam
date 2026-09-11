import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type LiveKind = "message" | "account";

/**
 * Publish a slim, public-safe team activity event for the dashboard live pulse.
 * Authenticated users can call this; inserts use the service role.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const kind: LiveKind | null =
    body.kind === "message" || body.kind === "account" ? body.kind : null;
  const actorName =
    typeof body.actorName === "string" && body.actorName.trim()
      ? body.actorName.trim().slice(0, 120)
      : null;
  const summary =
    typeof body.summary === "string" && body.summary.trim()
      ? body.summary.trim().slice(0, 200)
      : null;
  const href = typeof body.href === "string" ? body.href.slice(0, 300) : null;

  if (!kind || !actorName || !summary) {
    return NextResponse.json(
      { error: "kind, actorName, and summary are required" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ ok: true, published: false, reason: "no_service_role" });
  }

  const { data, error } = await admin
    .from("team_live_events")
    .insert({
      kind,
      actor_name: actorName,
      summary,
      href,
      created_by: user.id,
    })
    .select("id, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, published: true, id: data.id, created_at: data.created_at });
}
