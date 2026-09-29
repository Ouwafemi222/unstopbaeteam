"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export type WeeklyActivityTab = "weekly" | "prospects";

export function WeeklyActivityTabs({
  tab,
  yearMonth,
}: {
  tab: WeeklyActivityTab;
  yearMonth: string;
}) {
  const base = `/weekly-activity?month=${yearMonth}`;

  return (
    <div className="flex gap-1 rounded-lg border border-neutral-200 bg-white p-1 w-fit">
      <Link
        href={`${base}&tab=weekly`}
        className={cn(
          "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
          tab === "weekly"
            ? "bg-[#7b1e3a] text-white"
            : "text-neutral-600 hover:bg-neutral-100"
        )}
      >
        Weekly submissions
      </Link>
      <Link
        href={`${base}&tab=prospects`}
        className={cn(
          "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
          tab === "prospects"
            ? "bg-[#7b1e3a] text-white"
            : "text-neutral-600 hover:bg-neutral-100"
        )}
      >
        Daily prospects
      </Link>
    </div>
  );
}
