import Link from "next/link";
import { ClipboardPen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { loadMemberSheet } from "@/lib/weekly-evaluation/review";

export async function MemberEvaluationPrompt({ teamMemberId }: { teamMemberId: string }) {
  const supabase = await createClient();
  const sheet = await loadMemberSheet(supabase, teamMemberId);
  if (!sheet.ok || !sheet.round || sheet.submission || !sheet.rangeLabel) return null;

  return (
    <Link
      href="/weekly-evaluation"
      className="flex items-center gap-3 rounded-2xl border border-[#7b1e3a]/20 bg-[#f6e8ec] px-4 py-3 text-[#5c1228] shadow-sm hover:border-[#7b1e3a]/40"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#7b1e3a] text-white">
        <ClipboardPen className="h-5 w-5" />
      </span>
      <span>
        <span className="block font-semibold">Your weekly evaluation is ready</span>
        <span className="block text-sm text-[#5c1228]/70">
          Open the Weekly Evaluation page for {sheet.rangeLabel}, fill it in, and submit.
        </span>
      </span>
    </Link>
  );
}
