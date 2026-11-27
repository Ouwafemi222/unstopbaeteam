import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { findOnlineNumber } from "@/lib/phone-numbers/catalog";
import { markNumberUsed } from "@/lib/phone-numbers/claims";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { number?: string } | null;
  const number = String(body?.number || "").replace(/\D/g, "");
  if (number.length < 6 || number.length > 15) {
    return NextResponse.json({ error: "Pick a number" }, { status: 400 });
  }

  const listed = await findOnlineNumber(number);
  if (!listed) return NextResponse.json({ error: "That number is no longer listed" }, { status: 404 });

  const { data: member } = await supabase
    .from("team_members")
    .select("id, full_name, preferred_name")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member) {
    return NextResponse.json({ error: "Your login is not linked to a team member" }, { status: 400 });
  }

  const memberName = member.preferred_name?.trim() || member.full_name;
  try {
    const usedBy = await markNumberUsed(supabase, user.id, number, listed.added, memberName, member.id);
    return NextResponse.json({ usedBy });
  } catch {
    return NextResponse.json({ error: "The used list is not ready yet" }, { status: 503 });
  }
}
