import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserScope } from "@/lib/auth/scope";
import { createClient } from "@/lib/supabase/server";
import { loadEvaluationSnapshot, loadMemberSheet } from "@/lib/weekly-evaluation/review";
import { formatSheetDay, formatSheetRange } from "@/lib/weekly-evaluation/week";
import { PublishForm } from "@/components/weekly-evaluation/publish-form";
import { SubmitForm } from "@/components/weekly-evaluation/submit-form";
import { ReviewList } from "@/components/weekly-evaluation/review-list";

export default async function WeeklyEvaluationPage() {
  const scope = await getUserScope();
  if (!scope) redirect("/login");

  const supabase = await createClient();
  const isSuperAdmin = scope.roleSlugs.includes("super_admin");

  if (isSuperAdmin) {
    const snapshot = await loadEvaluationSnapshot(supabase);
    if (!snapshot.ok) {
      return (
        <div className="max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950">
          {snapshot.missingTable
            ? "Run supabase/migrations/20261017120000_weekly_evaluation.sql in the Supabase SQL editor, then refresh this page."
            : snapshot.message}
        </div>
      );
    }

    const ownReview = scope.teamMember
      ? snapshot.reviews.find((review) => review.teamMemberId === scope.teamMember?.id)
      : undefined;

    return (
      <div className="mx-auto max-w-3xl space-y-8 pb-12">
        <header>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7b1e3a]">
            Team template
          </p>
          <h1 className="mt-1 text-2xl font-bold text-neutral-900">Weekly Evaluation</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Send it once this week. Members submit from their dashboard. Their answers are checked
            against the accounts, messages, orders, and prospects they recorded.
          </p>
        </header>

        {snapshot.canPublish && <PublishForm windowLabel={snapshot.windowLabel} />}

        {snapshot.activeRound && (
          <>
            <ReviewList
              reviews={snapshot.reviews}
              rangeLabel={formatSheetRange(
                snapshot.activeRound.week_start,
                snapshot.activeRound.week_end
              )}
            />
            {ownReview && !ownReview.submitted && (
              <SubmitForm
                roundId={snapshot.activeRound.id}
                topics={snapshot.topics}
                rangeLabel={formatSheetRange(
                  snapshot.activeRound.week_start,
                  snapshot.activeRound.week_end
                )}
              />
            )}
          </>
        )}

        {snapshot.previousRound && snapshot.previousReviews.length > 0 && (
          <ReviewList
            reviews={snapshot.previousReviews}
            rangeLabel={formatSheetRange(
              snapshot.previousRound.week_start,
              snapshot.previousRound.week_end
            )}
          />
        )}
      </div>
    );
  }

  if (!scope.teamMember) redirect("/dashboard");

  const sheet = await loadMemberSheet(supabase, scope.teamMember.id);
  if (!sheet.ok) {
    return (
      <div className="max-w-3xl rounded-2xl border border-neutral-200 bg-white px-5 py-4 text-sm text-neutral-600">
        {sheet.missingTable
          ? "The weekly evaluation has not been set up yet. Ask your super admin."
          : sheet.message}
      </div>
    );
  }

  if (!sheet.round || !sheet.rangeLabel) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-[#7b1e3a]/15 bg-white px-5 py-6">
        <h1 className="text-2xl font-bold text-neutral-900">Weekly Evaluation</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Your trainer has not sent this week’s sheet yet. It will pop up on your dashboard when
          they do.
        </p>
        <Link href="/dashboard" className="mt-4 inline-block text-sm font-semibold text-[#7b1e3a]">
          Back to dashboard
        </Link>
      </div>
    );
  }

  if (sheet.submission) {
    const answers = new Map(sheet.submission.answers.map((answer) => [answer.topicId, answer]));
    return (
      <div className="mx-auto max-w-3xl space-y-4 pb-12">
        <header>
          <h1 className="text-2xl font-bold text-neutral-900">Weekly Evaluation</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Submitted for {sheet.rangeLabel} on {formatSheetDay(sheet.submission.reviewDate)}.
          </p>
        </header>
        <ul className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-5">
          {sheet.topics.map((topic) => {
            const answer = answers.get(topic.id);
            const value =
              topic.kind === "text"
                ? answer?.valueText || "—"
                : answer?.valueText || (answer?.valueNumber != null ? String(answer.valueNumber) : "—");
            return (
              <li key={topic.id}>
                <p className="text-sm font-semibold text-neutral-900">{topic.title}</p>
                <p className="text-sm text-neutral-600">{value}</p>
              </li>
            );
          })}
          {sheet.submission.notes && (
            <li>
              <p className="text-sm font-semibold text-neutral-900">Note</p>
              <p className="text-sm text-neutral-600">{sheet.submission.notes}</p>
            </li>
          )}
        </ul>
      </div>
    );
  }

  return (
    <SubmitForm roundId={sheet.round.id} topics={sheet.topics} rangeLabel={sheet.rangeLabel} />
  );
}
