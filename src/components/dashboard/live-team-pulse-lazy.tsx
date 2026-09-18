"use client";

import dynamic from "next/dynamic";

const LiveTeamPulse = dynamic(
  () =>
    import("@/components/dashboard/live-team-pulse").then((m) => m.LiveTeamPulse),
  {
    ssr: false,
    loading: () => (
      <div className="h-14 animate-pulse rounded-xl bg-neutral-100/80 border border-neutral-100" />
    ),
  }
);

export function LiveTeamPulseLazy({
  variant = "default",
}: {
  variant?: "default" | "embedded";
}) {
  return <LiveTeamPulse variant={variant} />;
}
