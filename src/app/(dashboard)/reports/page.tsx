"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Download, Printer } from "lucide-react";

const reportTypes = [
  { id: "monthly_messages", label: "Monthly Message Report" },
  { id: "team_member", label: "Team Member Report" },
  { id: "account", label: "Account Report" },
  { id: "service", label: "Service Performance Report" },
  { id: "country", label: "Country Report" },
  { id: "zero_message", label: "Zero Message Report" },
  { id: "account_opening", label: "Account Opening Report" },
];

export default function ReportsPage() {
  const [reportType, setReportType] = useState("monthly_messages");
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(new Date().getFullYear()));

  function handleExport() {
    window.open(`/api/reports/export?type=${reportType}&month=${month}&year=${year}`, "_blank");
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Reports</h1>
        <p className="text-neutral-500 mt-1">Generate and export team reports</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Report Configuration</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700">Report Type</label>
              <Select value={reportType} onChange={(e) => setReportType(e.target.value)}>
                {reportTypes.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700">Month</label>
              <Select value={month} onChange={(e) => setMonth(e.target.value)}>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2000, i).toLocaleString("en", { month: "long" })}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-neutral-700">Year</label>
              <Select value={year} onChange={(e) => setYear(e.target.value)}>
                {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
              </Select>
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleExport}><Download className="h-4 w-4" /> Export CSV</Button>
            <Button variant="outline" onClick={handlePrint}><Printer className="h-4 w-4" /> Print View</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-neutral-500">
            Select a report type and date range, then export as CSV or use Print View.
            PDF export will be available in a future update.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
