import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getUserScope } from "@/lib/auth/scope";
import { createClient } from "@/lib/supabase/server";
import { parseWrittenNumber } from "@/lib/weekly-evaluation/review";

type IncomingAnswer = { topicId?: string; value?: string };

export async function POST(request: Request) {
  const scope = await getUserScope();
  if (!scope) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!scope.teamMember) {
    return NextResponse.json(
      { error: "Your login is not linked to a team member profile." },
      { status: 400 }
    );
  }

  let body: { roundId?: string; reviewDate?: string; notes?: string; answers?: IncomingAnswer[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const roundId = body.roundId?.trim();
  const reviewDate = body.reviewDate?.trim();
  if (!roundId || !reviewDate || !/^\d{4}-\d{2}-\d{2}$/.test(reviewDate)) {
    return NextResponse.json({ error: "Add the date, then submit." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: round, error: roundError } = await supabase
    .from("weekly_evaluation_rounds")
    .select("id, status")
    .eq("id", roundId)
    .maybeSingle();

  if (roundError) return NextResponse.json({ error: roundError.message }, { status: 400 });
  if (!round || round.status !== "published") {
    return NextResponse.json({ error: "This sheet is not open." }, { status: 400 });
  }

  const { data: topics, error: topicError } = await supabase
    .from("weekly_evaluation_topics")
    .select("id, kind, title")
    .eq("round_id", roundId);

  if (topicError) return NextResponse.json({ error: topicError.message }, { status: 400 });

  const topicRows = (topics ?? []) as { id: string; kind: string; title: string }[];
  const incoming = new Map(
    (body.answers ?? [])
      .filter((answer) => answer.topicId)
      .map((answer) => [answer.topicId as string, (answer.value ?? "").trim()])
  );

  const answerRows: { topic_id: string; value_text: string | null; value_number: number | null }[] =
    [];

  for (const topic of topicRows) {
    const raw = incoming.get(topic.id) ?? "";
    if (topic.kind === "text") {
      answerRows.push({
        topic_id: topic.id,
        value_text: raw || null,
        value_number: null,
      });
      continue;
    }
    const number = parseWrittenNumber(raw);
    if (number == null || number < 0) {
      return NextResponse.json(
        { error: `Enter a number for “${topic.title}”.` },
        { status: 400 }
      );
    }
    answerRows.push({
      topic_id: topic.id,
      value_text: raw,
      value_number: number,
    });
  }

  const { data: submission, error: submissionError } = await supabase
    .from("weekly_evaluation_submissions")
    .insert({
      round_id: roundId,
      team_member_id: scope.teamMember.id,
      review_date: reviewDate,
      notes: body.notes?.trim() || null,
    })
    .select("id")
    .single();

  if (submissionError || !submission) {
    const message = submissionError?.message ?? "Could not submit.";
    if (/duplicate|unique/i.test(message)) {
      return NextResponse.json({ error: "You already submitted this week's sheet." }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { error: answerError } = await supabase.from("weekly_evaluation_answers").insert(
    answerRows.map((answer) => ({ ...answer, submission_id: submission.id }))
  );

  if (answerError) {
    await supabase.from("weekly_evaluation_submissions").delete().eq("id", submission.id);
    return NextResponse.json({ error: answerError.message }, { status: 400 });
  }

  revalidatePath("/dashboard");
  revalidatePath("/weekly-evaluation");

  return NextResponse.json({ ok: true });
}
