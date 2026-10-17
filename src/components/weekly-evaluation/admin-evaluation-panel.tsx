import Link from "next/link";
import { ClipboardPen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { loadEvaluationSnapshot } from "@/lib/weekly-evaluation/review";
import { formatSheetRange } from "@/lib/weekly-evaluation/week";
import { ReviewList } from "@/components/weekly-evaluation/review-list";
import { AdminMismatchPopup } from "@/components/weekly-evaluation/evaluation-popups";

export async function AdminEvaluationPanel() {
  const supabase = await createClient();
  const snapshot = await loadEvaluationSnapshot(supabase);

  if (!snapshot.ok) {
    if (!snapshot.missingTable) return null;
    return (
      <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        Weekly evaluation needs a one-time database update before you can send it. Run{" "}
        <span className="font-semibold">supabase/migrations/20261017120000_weekly_evaluation.sql</span>{" "}
        in the Supabase SQL editor, then refresh.
      </section>
    );
  }

  if (!snapshot.activeRound) {
    return (
      <section className="rounded-2xl border border-[#7b1e3a]/15 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f6e8ec] text-[#7b1e3a]">
              <ClipboardPen className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-bold text-neutral-900">Weekly evaluation</h2>
              <p className="mt-1 text-sm text-neutral-500">
                Send the sheet for {snapshot.windowLabel}. It will pop up on every team member’s
                dashboard.
              </p>
            </div>
          </div>
          <Link
            href="/weekly-evaluation"
            className="inline-flex h-10 items-center rounded-lg bg-[#7b1e3a] px-4 text-sm font-medium text-white hover:bg-[#5c1228]"
          >
            Open template
          </Link>
        </div>
      </section>
    );
  }

  const rangeLabel = formatSheetRange(
    snapshot.activeRound.week_start,
    snapshot.activeRound.week_end
  );
  const mismatchLines = snapshot.reviews.flatMap((review) =>
    review.lines
      .filter((line) => line.matches === false)
      .map((line) => ({
        name: review.name,
        detail: `${line.title}: wrote ${line.claimed}, recorded ${line.recordedLabel}`,
      }))
  );

  return (
    <>
      <AdminMismatchPopup roundId={snapshot.activeRound.id} lines={mismatchLines} />
      <ReviewList reviews={snapshot.reviews} rangeLabel={rangeLabel} variant="dashboard" />
    </>
  );
}
