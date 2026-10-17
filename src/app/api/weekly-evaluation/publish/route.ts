import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { WEEKLY_EVALUATION_TOPICS } from "@/lib/weekly-evaluation/template";
import { currentPublishWindow, formatSheetRange } from "@/lib/weekly-evaluation/week";

type ExtraTopic = { title?: string; kind?: string };

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { data: isAdmin } = await supabase.rpc("is_super_admin");
  if (!isAdmin) {
    return NextResponse.json({ error: "Only the super admin can send this sheet." }, { status: 403 });
  }

  let extras: ExtraTopic[] = [];
  try {
    const body = (await request.json()) as { extraTopics?: ExtraTopic[] };
    if (Array.isArray(body.extraTopics)) extras = body.extraTopics.slice(0, 8);
  } catch {
    extras = [];
  }

  const window = currentPublishWindow();
  const { data: existing, error: existingError } = await supabase
    .from("weekly_evaluation_rounds")
    .select("id")
    .eq("status", "published")
    .lte("week_start", window.weekEnd)
    .gte("week_end", window.weekStart)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 400 });
  }
  if (existing) {
    return NextResponse.json(
      { error: "This week's sheet has already been sent." },
      { status: 409 }
    );
  }

  const rangeLabel = formatSheetRange(window.weekStart, window.weekEnd);
  const { data: round, error: roundError } = await supabase
    .from("weekly_evaluation_rounds")
    .insert({
      week_start: window.weekStart,
      week_end: window.weekEnd,
      title: `Weekly evaluation · ${rangeLabel}`,
      status: "published",
      published_by: user.id,
    })
    .select("id")
    .single();

  if (roundError || !round) {
    return NextResponse.json(
      { error: roundError?.message ?? "Could not publish the sheet." },
      { status: 400 }
    );
  }

  const topicRows = [
    ...WEEKLY_EVALUATION_TOPICS.map((topic, index) => ({
      round_id: round.id,
      position: index + 1,
      tally_key: topic.tallyKey,
      title: topic.title,
      prompt: topic.prompt,
      kind: topic.kind,
    })),
    ...extras
      .map((topic) => ({
        title: topic.title?.trim() ?? "",
        kind: topic.kind === "text" ? "text" : "count",
      }))
      .filter((topic) => topic.title.length > 0)
      .map((topic, index) => ({
        round_id: round.id,
        position: WEEKLY_EVALUATION_TOPICS.length + index + 1,
        tally_key: null,
        title: topic.title,
        prompt: "Answer this extra question for the week.",
        kind: topic.kind,
      })),
  ];

  const { error: topicError } = await supabase.from("weekly_evaluation_topics").insert(topicRows);
  if (topicError) {
    await supabase.from("weekly_evaluation_rounds").delete().eq("id", round.id);
    return NextResponse.json({ error: topicError.message }, { status: 400 });
  }

  const { data: members } = await supabase
    .from("team_members")
    .select("user_id, full_name, preferred_name")
    .eq("status", "active")
    .not("user_id", "is", null);

  const notifications = (members ?? [])
    .filter((member) => member.user_id)
    .map((member) => {
      const name = member.preferred_name || member.full_name?.split(" ")[0] || "there";
      const own = member.user_id === user.id;
      return {
        user_id: member.user_id as string,
        title: "Weekly evaluation is ready",
        message: own
          ? `You sent the sheet for ${rangeLabel}. Open Weekly Evaluation and fill yours too.`
          : `Hi ${name} — the sheet for ${rangeLabel} is ready. Open Weekly Evaluation in your menu, fill it in, and submit.`,
        link: "/weekly-evaluation",
      };
    });

  if (!notifications.some((item) => item.user_id === user.id)) {
    notifications.push({
      user_id: user.id,
      title: "Weekly evaluation is ready",
      message: `You sent the sheet for ${rangeLabel}. Open Weekly Evaluation and fill yours too.`,
      link: "/weekly-evaluation",
    });
  }

  if (notifications.length > 0) {
    const admin = createAdminClient();
    const writer = admin ?? supabase;
    await writer.from("user_notifications").insert(notifications);
  }

  revalidatePath("/dashboard");
  revalidatePath("/weekly-evaluation");

  return NextResponse.json({ ok: true, roundId: round.id, rangeLabel });
}
