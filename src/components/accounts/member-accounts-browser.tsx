"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Ban, Pencil, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AccountStatusBadge } from "@/components/shared/status-badges";
import {
  BlockAccountButton,
  RestoreAccountButton,
} from "@/components/accounts/block-account-button";
import { formatDate } from "@/lib/utils";
import type { FiverrAccount } from "@/types/database";

interface MemberAccountsBrowserProps {
  accounts: FiverrAccount[];
  blocked: FiverrAccount[];
  basePath: string;
  allowBlock?: boolean;
}

function countryLabel(account: FiverrAccount) {
  const country = account.country as { flag_emoji?: string; name?: string } | null | undefined;
  return `${country?.flag_emoji ?? ""} ${country?.name ?? ""}`.trim();
}

function matches(account: FiverrAccount, query: string) {
  const haystack = [
    account.username,
    account.display_name,
    account.email,
    account.phone,
    account.verification_code,
    account.proxy_host,
    account.proxy_port,
    account.proxy_username,
    account.proxy_code,
    account.written_service,
    account.service?.name,
    countryLabel(account),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

function proxyLine(account: FiverrAccount) {
  const host = account.proxy_host?.trim();
  const port = account.proxy_port?.trim();
  if (!host && !port && !account.proxy_username) return null;
  const endpoint = [host, port].filter(Boolean).join(":");
  return { endpoint, username: account.proxy_username };
}

export function MemberAccountsBrowser({
  accounts,
  blocked,
  basePath,
  allowBlock = true,
}: MemberAccountsBrowserProps) {
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();

  const filtered = useMemo(
    () => (query ? accounts.filter((account) => matches(account, query)) : accounts),
    [accounts, query]
  );
  const filteredBlocked = useMemo(
    () => (query ? blocked.filter((account) => matches(account, query)) : blocked),
    [blocked, query]
  );

  const total = accounts.length + blocked.length;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search your accounts by username, service, email, phone, or proxy"
            className="h-11 pl-10"
            aria-label="Search your Fiverr accounts"
          />
        </div>
        <p className="px-1 pt-2 text-xs text-neutral-500">
          {query
            ? `${filtered.length + filteredBlocked.length} of ${total} match “${search.trim()}”`
            : `${accounts.length} active account${accounts.length === 1 ? "" : "s"}`}
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-6 py-10 text-center">
          <p className="text-sm font-medium text-neutral-800">
            {query ? "No accounts match that search" : "No active accounts"}
          </p>
          <p className="mt-1 text-sm text-neutral-500">
            {query
              ? "Try the Fiverr username, email, phone, or the proxy host."
              : "Blocked accounts are listed below."}
          </p>
        </div>
      ) : (
        <div className="responsive-table bg-white rounded-xl border shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-neutral-500 bg-neutral-50">
                <th className="p-3 font-medium">Username</th>
                <th className="p-3 font-medium">Service</th>
                <th className="p-3 font-medium">Email</th>
                <th className="p-3 font-medium">Phone</th>
                <th className="p-3 font-medium">Country</th>
                <th className="p-3 font-medium">Proxy</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Opened</th>
                <th className="p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((acc) => {
                const proxy = proxyLine(acc);
                return (
                  <tr key={acc.id} className="border-b hover:bg-neutral-50">
                    <td className="p-3 font-medium text-neutral-900">{acc.username}</td>
                    <td className="p-3">{acc.written_service || acc.service?.name || "—"}</td>
                    <td className="p-3">{acc.email ?? "—"}</td>
                    <td className="p-3">{acc.phone ?? "—"}</td>
                    <td className="p-3">{countryLabel(acc) || "—"}</td>
                    <td className="p-3">
                      {proxy ? (
                        <>
                          <p className="font-mono text-xs text-neutral-900">{proxy.endpoint || "—"}</p>
                          <p className="text-xs text-neutral-500">{proxy.username || ""}</p>
                        </>
                      ) : (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                    <td className="p-3">
                      <AccountStatusBadge status={acc.status} />
                    </td>
                    <td className="p-3">{formatDate(acc.opening_date)}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap items-center gap-1">
                        <Link href={`${basePath}/${acc.id}/edit`}>
                          <Button variant="ghost" size="sm">
                            <Pencil className="h-4 w-4" /> Edit
                          </Button>
                        </Link>
                        {allowBlock && (
                          <BlockAccountButton accountId={acc.id} username={acc.username} />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {allowBlock && filteredBlocked.length > 0 && (
        <div className="space-y-2 pt-2">
          <h3 className="text-sm font-semibold text-neutral-700 flex items-center gap-2 px-1">
            <Ban className="h-4 w-4 text-red-500" />
            Blocked accounts ({filteredBlocked.length})
          </h3>
          <p className="text-xs text-neutral-500 px-1">
            These stay off your active list. Restore one if Fiverr unblocks it.
          </p>
          <div className="responsive-table bg-neutral-50 rounded-xl border border-neutral-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-neutral-500">
                  <th className="p-3 font-medium">Username</th>
                  <th className="p-3 font-medium">Email</th>
                  <th className="p-3 font-medium">Proxy</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">Blocked</th>
                  <th className="p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBlocked.map((acc) => {
                  const proxy = proxyLine(acc);
                  return (
                    <tr key={acc.id} className="border-b border-neutral-200">
                      <td className="p-3 font-medium text-neutral-700">{acc.username}</td>
                      <td className="p-3 text-neutral-500">{acc.email ?? "—"}</td>
                      <td className="p-3 font-mono text-xs text-neutral-600">
                        {proxy?.endpoint || "—"}
                      </td>
                      <td className="p-3">
                        <AccountStatusBadge status={acc.status} />
                      </td>
                      <td className="p-3 text-neutral-500">{formatDate(acc.archived_at)}</td>
                      <td className="p-3">
                        <RestoreAccountButton accountId={acc.id} username={acc.username} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
