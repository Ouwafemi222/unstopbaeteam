"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/shared/date-input";
import { getTodayDate } from "@/lib/utils/form-defaults";
import type { SheetTopic } from "@/lib/weekly-evaluation/review";

export function SubmitForm({
  roundId,
  topics,
  rangeLabel,
}: {
  roundId: string;
  topics: SheetTopic[];
  rangeLabel: string;
}) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [reviewDate, setReviewDate] = useState(getTodayDate());
  const [sending, setSending] = useState(false);

  async function submitSheet(event: React.FormEvent) {
    event.preventDefault();
    setSending(true);
    try {
      const response = await fetch("/api/weekly-evaluation/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roundId,
          reviewDate,
          notes,
          answers: topics.map((topic) => ({
            topicId: topic.id,
            value: values[topic.id] ?? "",
          })),
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast.error(data.error || "Could not submit.");
        return;
      }
      toast.success("Submitted. Your trainer can review it now.");
      router.refresh();
    } catch {
      toast.error("Could not submit.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={submitSheet} className="mx-auto max-w-3xl">
      <div className="rounded-[1.35rem] bg-[#c5ced6] p-2.5 shadow-[0_18px_40px_-24px_rgba(60,30,40,0.45)] sm:p-3">
        <div className="relative overflow-hidden rounded-2xl border border-white/80 bg-[#f7f9fc]">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-8 border-r border-[#e7b7c3] bg-[#fdecef]/80 sm:w-10" />
          <div className="relative px-5 py-7 pl-12 sm:px-8 sm:pl-16">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7b1e3a]/80">
              UNSTOPPABLE TEAM
            </p>
            <h1 className="mt-1 text-3xl font-bold text-[#1e3a5f]">Weekly Evaluation</h1>
            <p className="mt-2 text-sm text-neutral-500">
              This sheet is for <span className="font-medium text-neutral-700">{rangeLabel}</span>.
              Write your numbers, add the date, then submit.
            </p>

            <div className="mt-5 max-w-xs">
              <DateInput
                id="weekly-eval-date"
                label="Date"
                value={reviewDate}
                onChange={setReviewDate}
                required
              />
            </div>

            <ol className="mt-6 space-y-5">
              {topics.map((topic, index) => (
                <li key={topic.id} className="border-b border-dashed border-[#d5e0ea] pb-4">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#7b1e3a] text-xs font-bold text-white">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-neutral-900">{topic.title}</p>
                      <p className="mt-1 text-sm text-neutral-500">{topic.prompt}</p>
                      {topic.kind === "text" ? (
                        <textarea
                          value={values[topic.id] ?? ""}
                          onChange={(event) =>
                            setValues((current) => ({ ...current, [topic.id]: event.target.value }))
                          }
                          rows={3}
                          placeholder="Write what you got done"
                          className="mt-2 w-full rounded-lg border border-[#d5e0ea] bg-white/80 px-3 py-2 text-sm text-neutral-900 focus:border-[#7b1e3a] focus:outline-none"
                        />
                      ) : (
                        <input
                          value={values[topic.id] ?? ""}
                          onChange={(event) =>
                            setValues((current) => ({ ...current, [topic.id]: event.target.value }))
                          }
                          inputMode={topic.kind === "amount" ? "decimal" : "numeric"}
                          placeholder={topic.kind === "amount" ? "Amount" : "0"}
                          aria-label={topic.title}
                          className="mt-2 w-full max-w-[12rem] rounded-lg border border-[#d5e0ea] bg-white/80 px-3 py-2 text-lg text-[#1e3a5f] focus:border-[#7b1e3a] focus:outline-none"
                        />
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>

            <label className="mt-5 block">
              <span className="text-sm font-semibold text-neutral-900">Note for your trainer</span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                placeholder="Optional"
                className="mt-2 w-full rounded-lg border border-[#d5e0ea] bg-white/80 px-3 py-2 text-sm text-neutral-900 focus:border-[#7b1e3a] focus:outline-none"
              />
            </label>

            <Button type="submit" className="mt-5" disabled={sending}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Submit
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
