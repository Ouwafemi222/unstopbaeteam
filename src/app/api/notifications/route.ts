import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [{ data, error }, { count: unreadCount }] = await Promise.all([
    supabase
      .from("user_notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("user_notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("read_at", null),
  ]);

  if (error) {
    return NextResponse.json({ notifications: [], unreadCount: 0, error: error.message });
  }

  return NextResponse.json({
    notifications: data ?? [],
    unreadCount: unreadCount ?? 0,
  });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { id?: string; markAllRead?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const now = new Date().toISOString();

  if (body.markAllRead) {
    const { error, count } = await supabase
      .from("user_notifications")
      .update({ read_at: now }, { count: "exact" })
      .eq("user_id", user.id)
      .is("read_at", null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, updated: count ?? 0 });
  }

  if (!body.id || typeof body.id !== "string") {
    return NextResponse.json({ error: "Missing notification id" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("user_notifications")
    .update({ read_at: now })
    .eq("id", body.id)
    .eq("user_id", user.id)
    .select("id, read_at")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data) {
    return NextResponse.json(
      { error: "Notification not found or already updated" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, notification: data });
}
