"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#16a34a", "#f59e0b", "#3b82f6", "#8b5cf6", "#ef4444", "#06b6d4", "#ec4899"];

interface DashboardChartsProps {
  messages: { team_member_id: string; service_id: string | null; received_date: string }[];
  members: { id: string; full_name: string }[];
  countries: { id: string; name: string; flag_emoji: string | null }[];
  countryCounts: Record<string, number>;
}

export function DashboardCharts({ messages, members, countries, countryCounts }: DashboardChartsProps) {
  const memberCounts = new Map<string, number>();
  messages.forEach((m) => {
    memberCounts.set(m.team_member_id, (memberCounts.get(m.team_member_id) || 0) + 1);
  });

  const messagesByMember = [...memberCounts.entries()]
    .map(([id, count]) => ({
      name: members.find((m) => m.id === id)?.full_name?.split(" ").pop() ?? "Unknown",
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const accountsByCountry = Object.entries(countryCounts)
    .map(([id, count]) => {
      const country = countries.find((c) => c.id === id);
      return { name: country?.name ?? "Unknown", count, flag: country?.flag_emoji };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const monthlyMap = new Map<string, number>();
  messages.forEach((m) => {
    const month = m.received_date.substring(0, 7);
    monthlyMap.set(month, (monthlyMap.get(month) || 0) + 1);
  });
  const messagesByMonth = [...monthlyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month: month.substring(5), count }));

  if (messages.length === 0 && Object.keys(countryCounts).length === 0) {
    return null;
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {messagesByMonth.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Messages Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={messagesByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {messagesByMember.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Messages By Member</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={messagesByMember} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {accountsByCountry.length > 0 && (
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Accounts By Country</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={accountsByCountry}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={(props) => `${props.name}: ${props.value}`}
                >
                  {accountsByCountry.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
