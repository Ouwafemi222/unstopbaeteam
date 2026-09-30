import Link from "next/link";
import {
  BookOpen,
  ExternalLink,
  FileText,
  MapPin,
  Share2,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  PRUDENCE_OFFICE_URL,
  TEAM_BLUEPRINT_DAYS,
  type BlueprintDay,
  type BlueprintStep,
} from "@/lib/team-blueprint/content";

interface TeamBlueprintPageProps {
  memberName?: string | null;
}

export function TeamBlueprintPage({ memberName }: TeamBlueprintPageProps) {
  const firstName = memberName?.split(" ")[0] ?? "Team member";

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-10">
      <header className="relative overflow-hidden rounded-[1.75rem] border border-[#7b1e3a]/25 shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-br from-[#3d0c1c] via-[#5c1228] to-[#7b1e3a]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.08] bg-[radial-gradient(circle_at_80%_0%,white,transparent_55%)]" />
        <div className="relative px-6 py-8 sm:px-9 sm:py-10 text-white">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-rose-200/90">
            New member training
          </p>
          <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-rose-100 shrink-0" />
            Team Blueprint
          </h1>
          <p className="mt-3 text-sm sm:text-base text-rose-50/90 max-w-xl leading-relaxed">
            Hey {firstName} — follow this simple checklist day by day. It aligns with{" "}
            <strong className="text-white">THE PRUDENCE</strong> office accountability system your team uses in the
            office.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button
              asChild
              size="sm"
              className="bg-white text-[#5c1228] hover:bg-rose-50 font-semibold"
            >
              <a href={PRUDENCE_OFFICE_URL} target="_blank" rel="noopener noreferrer">
                Open THE PRUDENCE
                <ExternalLink className="ml-2 h-3.5 w-3.5" />
              </a>
            </Button>
            <Button
              asChild
              size="sm"
              variant="outline"
              className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            >
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          </div>
        </div>
      </header>

      <Card className="border-amber-200/80 bg-gradient-to-r from-amber-50/90 to-white">
        <CardContent className="p-5 flex gap-3 sm:items-start">
          <Shield className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-950/90 leading-relaxed">
            <p className="font-semibold text-amber-900">Important</p>
            <p className="mt-1">
              Training and daily habits should come from the{" "}
              <strong>Prudence package</strong> and your Digital Marketing class PDF — not mixed with unrelated
              “hacks” from the internet. Stay on script so the whole team works the same way.
            </p>
          </div>
        </CardContent>
      </Card>

      {TEAM_BLUEPRINT_DAYS.map((day) => (
        <BlueprintDaySection key={day.day} day={day} />
      ))}

      <p className="text-center text-xs text-neutral-400 px-4">
        More days will be added to this blueprint as your leads define them. Complete Day 1 before heavy Fiverr logging
        in UNSTOPPABLE TEAM.
      </p>
    </div>
  );
}

function BlueprintDaySection({ day }: { day: BlueprintDay }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3 px-1">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7b1e3a] text-sm font-bold text-white shadow-md shadow-[#7b1e3a]/30">
          {day.day}
        </span>
        <div>
          <h2 className="text-lg font-bold text-neutral-900">{day.title}</h2>
          <p className="text-sm text-neutral-500 mt-0.5">{day.intro}</p>
        </div>
      </div>

      <ol className="space-y-3">
        {day.steps.map((step, index) => (
          <BlueprintStepCard key={step.id} step={step} index={index + 1} />
        ))}
      </ol>
    </section>
  );
}

function BlueprintStepCard({ step, index }: { step: BlueprintStep; index: number }) {
  const isSocial = step.id.startsWith("social-");
  const isPdf = step.id === "pdf-training";
  const isPrudence = step.id === "prudence-only";

  const Icon = isSocial ? Share2 : isPdf ? FileText : isPrudence ? MapPin : BookOpen;

  return (
    <li>
      <Card className="overflow-hidden border-neutral-200/90 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-0">
          <div className="flex gap-4 p-5">
            <div className="flex flex-col items-center gap-2 shrink-0">
              <span className="text-xs font-bold text-neutral-400 tabular-nums">Step {index}</span>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f6e8ec] text-[#7b1e3a]">
                <Icon className="h-5 w-5" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-neutral-900">{step.title}</h3>
              <p className="text-sm text-neutral-600 mt-1.5 leading-relaxed">{step.detail}</p>
              {step.links && step.links.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {step.links.map((link) => (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#7b1e3a]/20 bg-[#faf8f9] px-3 py-1.5 text-xs font-medium text-[#5c1228] hover:bg-[#f6e8ec] transition-colors"
                      >
                        {link.label}
                        <ExternalLink className="h-3 w-3 opacity-60" />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </li>
  );
}
