import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, type LucideIcon } from "lucide-react";

interface RecordPageShellProps {
  backHref: string;
  backLabel: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  tone?: "message" | "account";
  children: ReactNode;
  maxWidthClass?: string;
}

export function RecordPageShell({
  backHref,
  backLabel,
  title,
  subtitle,
  icon: Icon,
  tone = "message",
  children,
  maxWidthClass = "max-w-2xl",
}: RecordPageShellProps) {
  const isMessage = tone === "message";

  return (
    <div className={`relative mx-auto ${maxWidthClass} space-y-6`}>
      <div
        className={`pointer-events-none absolute -inset-x-6 -top-6 h-56 rounded-[2rem] opacity-90 ${
          isMessage
            ? "bg-gradient-to-br from-brand-orange-light/70 via-white to-brand-green-light/40"
            : "bg-gradient-to-br from-brand-green-light/70 via-white to-emerald-50"
        }`}
      />
      <div className="relative space-y-6">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-brand-green"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>

        <div
          className={`rounded-2xl border px-5 py-6 sm:px-7 sm:py-7 shadow-sm ${
            isMessage
              ? "border-brand-orange/20 bg-white/80"
              : "border-brand-green/20 bg-white/80"
          }`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                isMessage
                  ? "bg-brand-orange text-white shadow-md shadow-brand-orange/30"
                  : "bg-brand-green text-white shadow-md shadow-brand-green/30"
              }`}
            >
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900">
                {title}
              </h1>
              <p className="text-neutral-600 mt-1.5 text-sm sm:text-base max-w-xl">{subtitle}</p>
            </div>
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}
