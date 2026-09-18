"use client";

import dynamic from "next/dynamic";

const MemberCharts = dynamic(
  () => import("@/components/dashboard/member-charts").then((m) => m.MemberCharts),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 animate-pulse rounded-xl bg-neutral-100 border border-neutral-100" />
    ),
  }
);

const DashboardCharts = dynamic(
  () =>
    import("@/components/dashboard/dashboard-charts").then((m) => m.DashboardCharts),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 animate-pulse rounded-xl bg-neutral-100 border border-neutral-100" />
    ),
  }
);

type MemberChartsProps = {
  messagesByMonth: { month: string; count: number }[];
  topServices: { name: string; count: number }[];
  accountsByCountry: { name: string; count: number; flag?: string | null }[];
};

type DashboardChartsProps = {
  messages: { team_member_id: string; service_id: string | null; received_date: string }[];
  members: { id: string; full_name: string }[];
  countries: { id: string; name: string; flag_emoji: string | null }[];
  countryCounts: Record<string, number>;
};

export function MemberChartsLazy(props: MemberChartsProps) {
  return <MemberCharts {...props} />;
}

export function DashboardChartsLazy(props: DashboardChartsProps) {
  return <DashboardCharts {...props} />;
}
