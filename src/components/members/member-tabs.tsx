"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AccountStatusBadge } from "@/components/shared/status-badges";
import { formatDate, formatDateTime, getMessageServiceLabel } from "@/lib/utils";
import { MESSAGE_STATUS_LABELS } from "@/lib/utils/dates";
import { MemberActivityFeed } from "@/components/members/member-activity-feed";
import type { MemberActivityItem } from "@/lib/members/activity-feed";
import type { TeamMember, FiverrAccount, Message } from "@/types/database";

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "accounts", label: "Fiverr Accounts" },
  { id: "messages", label: "Messages" },
  { id: "performance", label: "Performance" },
  { id: "notes", label: "Notes" },
  { id: "activity", label: "Activity" },
];

interface MemberTabsProps {
  memberId: string;
  currentTab: string;
  member: TeamMember;
  accounts: FiverrAccount[];
  messages: Message[];
  notes: { id: string; content: string; created_at: string; profile: { full_name: string } | null }[];
  memberActivity: MemberActivityItem[];
  earningsThisMonth?: number;
  bestService?: string;
  messagesThisMonth: number;
  messagesLastMonth: number;
  canManageAccounts?: boolean;
  canManageMessages?: boolean;
  readOnly?: boolean;
}

export function MemberTabs({
  memberId, currentTab, member, accounts, messages, notes, memberActivity,
  earningsThisMonth = 0,
  bestService, messagesThisMonth, messagesLastMonth, canManageAccounts, canManageMessages, readOnly,
}: MemberTabsProps) {
  const growth = messagesLastMonth > 0
    ? Math.round((messagesThisMonth - messagesLastMonth) / messagesLastMonth * 100)
    : messagesThisMonth > 0 ? 100 : 0;

  const visibleTabs = readOnly
    ? tabs.filter((t) => ["overview", "accounts", "messages", "performance", "activity"].includes(t.id))
    : tabs;

  return (
    <div>
      <div className="flex gap-1 border-b border-neutral-200 mb-6 overflow-x-auto">
        {visibleTabs.map((tab) => (
          <Link
            key={tab.id}
            href={`/team-members/${memberId}?tab=${tab.id}`}
            className={cn(
              "px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
              currentTab === tab.id
                ? "border-brand-green text-brand-green"
                : "border-transparent text-neutral-500 hover:text-neutral-700"
            )}
          >
            {tab.label}
            {tab.id === "accounts" && ` (${accounts.length})`}
            {tab.id === "messages" && ` (${messages.length})`}
            {tab.id === "activity" && memberActivity.length > 0 && ` (${memberActivity.length})`}
          </Link>
        ))}
      </div>

      {currentTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-neutral-500">Accounts Opened</p>
                <p className="text-2xl font-bold text-brand-green">{accounts.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-neutral-500">Messages Received</p>
                <p className="text-2xl font-bold text-brand-orange">{messages.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-neutral-500">Messages This Month</p>
                <p className="text-2xl font-bold">{messagesThisMonth}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-neutral-500">Earnings This Month</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(earningsThisMonth)}
                </p>
              </CardContent>
            </Card>
          </div>
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6 space-y-3">
              <h3 className="font-semibold text-neutral-900">Contact Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-neutral-500">Email</span><span>{member.email ?? "—"}</span></div>
                <div className="flex justify-between"><span className="text-neutral-500">Phone</span><span>{member.phone ?? "—"}</span></div>
                <div className="flex justify-between"><span className="text-neutral-500">Joined</span><span>{formatDate(member.date_joined)}</span></div>
                <div className="flex justify-between"><span className="text-neutral-500">Best Service</span><span>{bestService ?? "—"}</span></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 space-y-3">
              <h3 className="font-semibold text-neutral-900">Performance Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-neutral-500">Messages This Month</span><span className="font-semibold">{messagesThisMonth}</span></div>
                <div className="flex justify-between"><span className="text-neutral-500">Messages Last Month</span><span>{messagesLastMonth}</span></div>
                <div className="flex justify-between"><span className="text-neutral-500">Change</span>
                  <span className={growth >= 0 ? "text-emerald-600" : "text-red-500"}>{growth > 0 ? "+" : ""}{growth}%</span>
                </div>
                <div className="flex justify-between"><span className="text-neutral-500">Messages per Account</span>
                  <span>{accounts.length > 0 ? (messages.length / accounts.length).toFixed(1) : "0"}</span>
                </div>
              </div>
            </CardContent>
          </Card>
          {member.notes && (
            <Card className="md:col-span-2">
              <CardContent className="p-6">
                <h3 className="font-semibold text-neutral-900 mb-2">Notes</h3>
                <p className="text-sm text-neutral-600">{member.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-neutral-900 mb-4">Recent Activity</h3>
              <MemberActivityFeed items={memberActivity.slice(0, 8)} />
            </CardContent>
          </Card>
        </div>
      )}

      {currentTab === "accounts" && (
        <div className="space-y-4">
          {!readOnly && canManageAccounts ? (
            <div className="rounded-xl border border-brand-green/20 bg-brand-green-light/20 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm text-neutral-700">
                Add or edit your Fiverr accounts on the dedicated accounts page.
              </p>
              <Link href="/my-accounts">
                <Button>Open My Fiverr Accounts</Button>
              </Link>
            </div>
          ) : null}
          {!readOnly && canManageAccounts && (
            <div className="flex justify-end">
              <Link href="/my-accounts/new">
                <Button>
                  <Plus className="h-4 w-4" />
                  Add Fiverr Account
                </Button>
              </Link>
            </div>
          )}
          <div className="responsive-table">
          {accounts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-neutral-500 mb-4">No Fiverr accounts yet.</p>
                {canManageAccounts && !readOnly && (
                  <Link href="/my-accounts/new">
                    <Button>Add Your First Account</Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ) : (
            <table className="w-full text-sm bg-white rounded-xl border">
              <thead>
                <tr className="border-b text-left text-neutral-500">
                  <th className="p-3 font-medium">Username</th>
                  <th className="p-3 font-medium">Email</th>
                  <th className="p-3 font-medium">Country</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">Opened</th>
                  {canManageAccounts && !readOnly && <th className="p-3 font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {accounts.map((acc) => (
                  <tr key={acc.id} className="border-b hover:bg-neutral-50">
                    <td className="p-3">
                      {canManageAccounts || readOnly ? (
                        <span className="font-medium text-neutral-900">{acc.username}</span>
                      ) : (
                        <Link href={`/accounts/${acc.id}`} className="text-brand-green hover:underline font-medium">
                          {acc.username}
                        </Link>
                      )}
                    </td>
                    <td className="p-3">{acc.email ?? "—"}</td>
                    <td className="p-3">{(acc.country as { flag_emoji: string; name: string })?.flag_emoji} {(acc.country as { name: string })?.name ?? "—"}</td>
                    <td className="p-3"><AccountStatusBadge status={acc.status} /></td>
                    <td className="p-3">{formatDate(acc.opening_date)}</td>
                    {canManageAccounts && !readOnly && (
                      <td className="p-3">
                        <Link href={`/my-accounts/${acc.id}/edit`}>
                          <Button variant="ghost" size="sm">
                            <Pencil className="h-4 w-4" /> Edit
                          </Button>
                        </Link>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          </div>
        </div>
      )}

      {currentTab === "messages" && (
        <div className="space-y-4">
          {!readOnly && canManageMessages && (
            <div className="flex justify-end">
              <Link href="/my-messages/new">
                <Button variant="secondary">
                  <Plus className="h-4 w-4" />
                  Record Message
                </Button>
              </Link>
            </div>
          )}
          <div className="responsive-table">
          {messages.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-neutral-500 mb-4">No messages recorded.</p>
                {canManageMessages && !readOnly && (
                  <Link href="/my-messages/new">
                    <Button variant="secondary">Record Your First Message</Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ) : (
            <table className="w-full text-sm bg-white rounded-xl border">
              <thead>
                <tr className="border-b text-left text-neutral-500">
                  <th className="p-3 font-medium">Date</th>
                  <th className="p-3 font-medium">Account</th>
                  <th className="p-3 font-medium">Service</th>
                  <th className="p-3 font-medium">Status</th>
                  {canManageMessages && !readOnly && <th className="p-3 font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {messages.map((msg) => (
                  <tr key={msg.id} className="border-b hover:bg-neutral-50">
                    <td className="p-3">{formatDate(msg.received_date)}</td>
                    <td className="p-3">{(msg.fiverr_account as { username: string })?.username ?? "—"}</td>
                    <td className="p-3">{getMessageServiceLabel(msg)}</td>
                    <td className="p-3"><Badge variant="neutral">{MESSAGE_STATUS_LABELS[msg.status]}</Badge></td>
                    {canManageMessages && !readOnly && (
                      <td className="p-3">
                        <Link href={`/my-messages/${msg.id}/edit`}>
                          <Button variant="ghost" size="sm">
                            <Pencil className="h-4 w-4" /> Edit
                          </Button>
                        </Link>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          </div>
        </div>
      )}

      {currentTab === "performance" && (
        <Card>
          <CardContent className="p-6">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div><p className="text-sm text-neutral-500">This Month</p><p className="text-3xl font-bold">{messagesThisMonth}</p></div>
              <div><p className="text-sm text-neutral-500">Last Month</p><p className="text-3xl font-bold">{messagesLastMonth}</p></div>
              <div><p className="text-sm text-neutral-500">Growth</p><p className={`text-3xl font-bold ${growth >= 0 ? "text-emerald-600" : "text-red-500"}`}>{growth > 0 ? "+" : ""}{growth}%</p></div>
              <div><p className="text-sm text-neutral-500">Best Service</p><p className="text-3xl font-bold">{bestService ?? "—"}</p></div>
            </div>
          </CardContent>
        </Card>
      )}

      {currentTab === "notes" && (
        <div className="space-y-3">
          {notes.length === 0 ? <p className="text-neutral-500">No notes yet.</p> : notes.map((note) => (
            <Card key={note.id}>
              <CardContent className="p-4">
                <p className="text-sm text-neutral-700">{note.content}</p>
                <p className="text-xs text-neutral-400 mt-2">{note.profile?.full_name} — {formatDateTime(note.created_at)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {currentTab === "activity" && (
        <MemberActivityFeed items={memberActivity} />
      )}
    </div>
  );
}
