"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { AccountStatusBadge } from "@/components/shared/status-badges";
import { formatDate } from "@/lib/utils";
import { Download, Search } from "lucide-react";
import type { FiverrAccount, TeamMember, Country } from "@/types/database";

interface AccountsTableProps {
  accounts: (FiverrAccount & { team_member: { full_name: string }; country: { name: string; flag_emoji: string } | null })[];
  members: Pick<TeamMember, "id" | "full_name">[];
  countries: Country[];
}

export function AccountsTable({ accounts, members, countries }: AccountsTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [memberFilter, setMemberFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");

  const filtered = useMemo(() => {
    return accounts.filter((acc) => {
      if (search) {
        const q = search.toLowerCase();
        const match =
          acc.username.toLowerCase().includes(q) ||
          acc.email?.toLowerCase().includes(q) ||
          acc.phone?.includes(q) ||
          acc.team_member?.full_name?.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (statusFilter && acc.status !== statusFilter) return false;
      if (memberFilter && acc.team_member_id !== memberFilter) return false;
      if (countryFilter && acc.country_id !== countryFilter) return false;
      return true;
    });
  }, [accounts, search, statusFilter, memberFilter, countryFilter]);

  function exportCSV() {
    const headers = ["Member", "Username", "Email", "Phone", "Country", "Opening Date", "Status", "Rate"];
    const rows = filtered.map((a) => [
      a.team_member?.full_name, a.username, a.email, a.phone,
      a.country?.name, a.opening_date, a.status,
      a.rate_amount ? `${a.rate_currency} ${a.rate_amount}` : "",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fiverr-accounts.csv";
    a.click();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search accounts..." className="pl-10" />
        </div>
        <Select value={memberFilter} onChange={(e) => setMemberFilter(e.target.value)}>
          <option value="">All Members</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
        </Select>
        <Select value={countryFilter} onChange={(e) => setCountryFilter(e.target.value)}>
          <option value="">All Countries</option>
          {countries.map((c) => <option key={c.id} value={c.id}>{c.flag_emoji} {c.name}</option>)}
        </Select>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="new">New</option>
          <option value="verified">Verified</option>
          <option value="pending_setup">Pending Setup</option>
          <option value="suspended">Suspended</option>
        </Select>
        <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4" /> Export</Button>
      </div>

      <div className="responsive-table bg-white rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-neutral-500 bg-neutral-50">
              <th className="p-3 font-medium">Member</th>
              <th className="p-3 font-medium">Username</th>
              <th className="p-3 font-medium">Email</th>
              <th className="p-3 font-medium">Country</th>
              <th className="p-3 font-medium">Opened</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Rate</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((acc) => (
              <tr key={acc.id} className="border-b hover:bg-neutral-50 cursor-pointer">
                <td className="p-3">
                  <Link href={`/accounts/${acc.id}`} className="text-brand-green hover:underline">
                    {acc.team_member?.full_name}
                  </Link>
                </td>
                <td className="p-3 font-medium">{acc.username}</td>
                <td className="p-3">{acc.email ?? "—"}</td>
                <td className="p-3">{acc.country?.flag_emoji} {acc.country?.name ?? "—"}</td>
                <td className="p-3">{formatDate(acc.opening_date)}</td>
                <td className="p-3"><AccountStatusBadge status={acc.status} /></td>
                <td className="p-3">{acc.rate_amount ? `${acc.rate_currency} ${acc.rate_amount}` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="p-6 text-center text-neutral-500">No accounts match your filters.</p>}
      </div>
      <p className="text-xs text-neutral-400">{filtered.length} of {accounts.length} accounts</p>
    </div>
  );
}
