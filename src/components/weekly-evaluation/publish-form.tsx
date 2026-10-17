"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WEEKLY_EVALUATION_TOPICS } from "@/lib/weekly-evaluation/template";

type Extra = { id: string; title: string; kind: "count" | "text" };

export function PublishForm({ windowLabel }: { windowLabel: string }) {
  const router = useRouter();
  const [extras, setExtras] = useState<Extra[]>([]);
  const [sending, setSending] = useState(false);

  function addExtra() {
    setExtras((current) => [
      ...current,
      { id: `extra-${current.length + 1}`, title: "", kind: "count" },
    ]);
  }

  async function sendSheet() {
    setSending(true);
    try {
      const response = await fetch("/api/weekly-evaluation/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          extraTopics: extras
            .map((topic) => ({ title: topic.title.trim(), kind: topic.kind }))
            .filter((topic) => topic.title),
        }),
      });
      const data = (await response.json()) as { error?: string; rangeLabel?: string };
      if (!response.ok) {
        toast.error(data.error || "Could not send the sheet.");
        return;
      }
      toast.success(`Sent. It is now on every team member’s dashboard (${data.rangeLabel}).`);
      router.refresh();
    } catch {
      toast.error("Could not send the sheet.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="rounded-[1.5rem] border border-[#7b1e3a]/15 bg-white shadow-sm overflow-hidden">
      <div className="bg-gradient-to-br from-[#3d0c1c] via-[#5c1228] to-[#7b1e3a] px-5 py-6 text-white sm:px-7">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-rose-200">
          Super admin
        </p>
        <h2 className="mt-1 text-2xl font-bold">Send this week’s evaluation</h2>
        <p className="mt-2 max-w-xl text-sm text-rose-50/90 leading-relaxed">
          This sheet covers <strong>{windowLabel}</strong>. Press send and it pops up on every
          team member’s dashboard. They fill it in and submit. You then see each answer next to
          what they actually recorded.
        </p>
      </div>

      <div className="space-y-4 px-5 py-5 sm:px-7">
        <ol className="space-y-3">
          {WEEKLY_EVALUATION_TOPICS.map((topic, index) => (
            <li key={topic.id} className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#7b1e3a] text-xs font-bold text-white">
                {index + 1}
              </span>
              <div>
                <p className="font-semibold text-neutral-900">{topic.title}</p>
                <p className="text-sm text-neutral-500">{topic.prompt}</p>
              </div>
            </li>
          ))}
        </ol>

        {extras.length > 0 && (
          <div className="space-y-2 border-t border-dashed border-neutral-200 pt-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-neutral-400">
              Extra questions for this week only
            </p>
            {extras.map((topic, index) => (
              <div key={topic.id} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  value={topic.title}
                  placeholder={`Extra question ${index + 1}`}
                  onChange={(event) =>
                    setExtras((current) =>
                      current.map((item) =>
                        item.id === topic.id ? { ...item, title: event.target.value } : item
                      )
                    )
                  }
                />
                <select
                  value={topic.kind}
                  onChange={(event) =>
                    setExtras((current) =>
                      current.map((item) =>
                        item.id === topic.id
                          ? { ...item, kind: event.target.value === "text" ? "text" : "count" }
                          : item
                      )
                    )
                  }
                  className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-700"
                >
                  <option value="count">Number</option>
                  <option value="text">Written note</option>
                </select>
                <button
                  type="button"
                  onClick={() => setExtras((current) => current.filter((item) => item.id !== topic.id))}
                  className="inline-flex h-10 items-center justify-center rounded-lg px-2 text-neutral-400 hover:text-[#7b1e3a]"
                  aria-label="Remove question"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <Button type="button" variant="outline" onClick={addExtra} disabled={extras.length >= 8}>
            <Plus className="h-4 w-4" />
            Add a question
          </Button>
          <Button type="button" onClick={sendSheet} disabled={sending}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send to the team
          </Button>
        </div>
      </div>
    </section>
  );
}
