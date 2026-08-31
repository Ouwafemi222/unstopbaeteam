"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";

const COLORS = ["#16a34a", "#f59e0b", "#3b82f6", "#8b5cf6", "#ef4444", "#06b6d4", "#ec4899"];

interface MemberChartsProps {
  messagesByMonth: { month: string; count: number }[];
  topServices: { name: string; count: number }[];
  accountsByCountry: { name: string; count: number; flag?: string | null }[];
}

export function MemberCharts({ messagesByMonth, topServices, accountsByCountry }: MemberChartsProps) {
  if (messagesByMonth.length === 0 && topServices.length === 0 && accountsByCountry.length === 0) {
    return null;
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {messagesByMonth.length > 0 && (
        <Card className="border-0 shadow-md overflow-hidden">
          <CardHeader className="pb-2 bg-gradient-to-r from-brand-green-light/40 to-transparent">
            <CardTitle className="text-base font-semibold">Message Activity</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={messagesByMonth}>
                <defs>
                  <linearGradient id="msgGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#16a34a" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#16a34a"
                  strokeWidth={2}
                  fill="url(#msgGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {topServices.length > 0 && (
        <Card className="border-0 shadow-md overflow-hidden">
          <CardHeader className="pb-2 bg-gradient-to-r from-brand-orange-light/60 to-transparent">
            <CardTitle className="text-base font-semibold">Top Gig Types</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topServices} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                <YAxis dataKey="name" type="category" width={88} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}
                />
                <Bar dataKey="count" fill="#f59e0b" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {accountsByCountry.length > 0 && (
        <Card className="border-0 shadow-md overflow-hidden lg:col-span-2">
          <CardHeader className="pb-2 bg-gradient-to-r from-blue-50 to-transparent">
            <CardTitle className="text-base font-semibold">Accounts by Country</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={accountsByCountry}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={3}
                  label={(props) => `${props.name}: ${props.value}`}
                >
                  {accountsByCountry.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
