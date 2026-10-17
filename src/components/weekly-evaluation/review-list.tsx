import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatSheetDay } from "@/lib/weekly-evaluation/week";
import { recordedSummary, type MemberReview } from "@/lib/weekly-evaluation/review";

export function ReviewList({
  reviews,
  rangeLabel,
  variant = "full",
}: {
  reviews: MemberReview[];
  rangeLabel: string;
  variant?: "full" | "dashboard";
}) {
  const mismatches = reviews.filter((review) => review.submitted && review.hasMismatch);
  const waiting = reviews.filter((review) => !review.submitted);
  const shown = variant === "dashboard" ? mismatches : reviews;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#7b1e3a]">
            Checked against the week
          </p>
          <h2 className="text-lg font-bold text-neutral-900">{rangeLabel}</h2>
          <p className="text-sm text-neutral-500 mt-1">
            {mismatches.length} {mismatches.length === 1 ? "answer does" : "answers do"} not match
            what was recorded. {waiting.length} still to submit.
          </p>
        </div>
        {variant === "dashboard" && (
          <Link href="/weekly-evaluation" className="text-sm font-semibold text-[#7b1e3a] hover:underline">
            Open the full sheet
          </Link>
        )}
      </div>

      {shown.length === 0 ? (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {reviews.length === 0
            ? "No team members to review yet."
            : waiting.length > 0
              ? `No mismatches in the sheets that are in. ${waiting.length} ${waiting.length === 1 ? "member has" : "members have"} not submitted.`
              : "Every submitted answer matches what that person recorded this week."}
        </p>
      ) : (
        <ul className="space-y-3">
          {shown.map((review) => (
            <li
              key={review.teamMemberId}
              className={`rounded-2xl border bg-white p-4 shadow-sm ${
                review.hasMismatch
                  ? "border-red-200"
                  : review.submitted
                    ? "border-emerald-200"
                    : "border-neutral-200"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-neutral-900">{review.name}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {review.submitted && review.reviewDate
                      ? `Submitted ${formatSheetDay(review.reviewDate)}`
                      : "Has not submitted"}
                  </p>
                </div>
                {review.submitted && review.hasMismatch && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Does not match
                  </span>
                )}
                {review.submitted && !review.hasMismatch && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Matches
                  </span>
                )}
              </div>

              <ul className="mt-3 space-y-1.5">
                {review.lines
                  .filter((line) => variant === "full" || line.matches === false)
                  .map((line) => (
                    <li key={line.topicId} className="text-sm text-neutral-700">
                      <span className="font-medium text-neutral-900">{line.title}:</span>{" "}
                      {line.kind === "text" || line.recordedLabel == null ? (
                        <span>{line.claimed}</span>
                      ) : (
                        <span>
                          wrote {line.claimed}, recorded {line.recordedLabel}
                          {line.matches === false && (
                            <span className="ml-2 font-semibold text-red-700">Does not match</span>
                          )}
                          {line.matches === true && (
                            <span className="ml-2 font-semibold text-emerald-700">Matches</span>
                          )}
                        </span>
                      )}
                    </li>
                  ))}
              </ul>

              {review.notes && variant === "full" && (
                <p className="mt-2 text-sm text-neutral-600">
                  <span className="font-medium text-neutral-900">Note:</span> {review.notes}
                </p>
              )}

              <p className="mt-3 text-xs leading-relaxed text-neutral-500">
                Recorded this week: {recordedSummary(review.recorded)}
                {review.recorded.activities.length > 0
                  ? `. Activity log: ${review.recorded.activities.join(" · ")}`
                  : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
