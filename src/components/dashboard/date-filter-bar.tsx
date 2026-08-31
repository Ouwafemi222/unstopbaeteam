"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const filters = [
  { value: "today", label: "Today" },
  { value: "this_week", label: "This Week" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
];

export function DateFilterBar({ current }: { current: string }) {
  const searchParams = useSearchParams();

  return (
    <div className="flex gap-1 rounded-lg border border-neutral-200 bg-white p-1">
      {filters.map((f) => (
        <Link
          key={f.value}
          href={`?filter=${f.value}`}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            current === f.value
              ? "bg-brand-green text-white"
              : "text-neutral-600 hover:bg-neutral-100"
          )}
        >
          {f.label}
        </Link>
      ))}
    </div>
  );
}
