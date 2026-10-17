"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ClipboardPen, X } from "lucide-react";
import { Button } from "@/components/ui/button";

function useSessionFlag(key: string) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(key) === "1") return;
    setOpen(true);
  }, [key]);

  function dismiss() {
    sessionStorage.setItem(key, "1");
    setOpen(false);
  }

  return { open, dismiss };
}

export function MemberEvaluationPopup({
  roundId,
  rangeLabel,
}: {
  roundId: string;
  rangeLabel: string;
}) {
  const { open, dismiss } = useSessionFlag(`weekly-eval-popup-${roundId}`);
  useLockScroll(open);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[82] flex items-end justify-center p-4 sm:items-center">
      <div className="absolute inset-0 bg-[#2a0a14]/60" onClick={dismiss} />
      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-3 top-3 rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f6e8ec] text-[#7b1e3a]">
          <ClipboardPen className="h-5 w-5" />
        </span>
        <h2 className="mt-4 text-xl font-bold text-neutral-900">Weekly evaluation is ready</h2>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">
          Your trainer sent the sheet for <span className="font-semibold">{rangeLabel}</span>. Fill
          in your numbers and submit.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/weekly-evaluation" onClick={dismiss}>
            <Button type="button">Fill it in</Button>
          </Link>
          <Button type="button" variant="outline" onClick={dismiss}>
            Later
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AdminMismatchPopup({
  roundId,
  lines,
}: {
  roundId: string;
  lines: { name: string; detail: string }[];
}) {
  const { open, dismiss } = useSessionFlag(`weekly-eval-mismatch-${roundId}`);
  useLockScroll(open);
  if (!open || lines.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[82] flex items-end justify-center p-4 sm:items-center">
      <div className="absolute inset-0 bg-[#2a0a14]/60" onClick={dismiss} />
      <div className="relative max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-3 top-3 rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-700">
          <AlertTriangle className="h-5 w-5" />
        </span>
        <h2 className="mt-4 text-xl font-bold text-neutral-900">Weekly numbers do not match</h2>
        <p className="mt-2 text-sm text-neutral-600">
          These members submitted a figure that is different from what they recorded during the
          week.
        </p>
        <ul className="mt-4 space-y-2">
          {lines.map((line) => (
            <li key={`${line.name}-${line.detail}`} className="rounded-xl bg-red-50 px-3 py-2 text-sm">
              <span className="font-semibold text-neutral-900">{line.name}</span>
              <span className="text-neutral-700"> — {line.detail}</span>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/weekly-evaluation" onClick={dismiss}>
            <Button type="button">Review the sheet</Button>
          </Link>
          <Button type="button" variant="outline" onClick={dismiss}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

function useLockScroll(open: boolean) {
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);
}
