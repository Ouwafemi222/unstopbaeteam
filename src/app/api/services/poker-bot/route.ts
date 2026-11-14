import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { POKER_BOT_NAME, POKER_BOT_SLUG } from "@/lib/services/poker-bot";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const db = admin ?? supabase;

  const { data: bySlug } = await db.from("services").select("*").eq("slug", POKER_BOT_SLUG).maybeSingle();
  if (bySlug) return NextResponse.json({ service: bySlug });

  const { data: byName } = await db.from("services").select("*").ilike("name", POKER_BOT_NAME).maybeSingle();
  if (byName) return NextResponse.json({ service: byName });

  const { data, error } = await db
    .from("services")
    .insert({
      name: POKER_BOT_NAME,
      slug: POKER_BOT_SLUG,
      description: "Poker bot and poker analysis gigs",
      is_active: true,
    })
    .select("*")
    .single();

  if (error || !data) {
    return NextResponse.json({ service: null, error: error?.message ?? "Could not add Poker Bot" });
  }

  return NextResponse.json({ service: data });
}
