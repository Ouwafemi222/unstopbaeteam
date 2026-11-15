import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ removed: false });

  const { data, error } = await supabase
    .from("team_members")
    .select("access_removed_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ removed: false });
  return NextResponse.json({ removed: Boolean(data?.access_removed_at) });
}
