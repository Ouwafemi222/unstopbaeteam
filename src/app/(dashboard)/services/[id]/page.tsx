import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageSquare, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, getMessageServiceLabel } from "@/lib/utils";
import { messageMatchesService } from "@/lib/services/message-match";
import { MESSAGE_STATUS_LABELS } from "@/lib/utils/dates";

interface Props {
  params: Promise<{ id: string }>;
}

interface MemberGroup {
  id: string;
  full_name: string;
  messageCount: number;
  lastDate: string;
  gigs: string[];
  messages: {
    id: string;
    received_date: string;
    gig_name: string | null;
    status: string;
  }[];
}

export default async function ServiceDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: service } = await supabase.from("services").select("*").eq("id", id).single();
  if (!service) notFound();

  const { data: messages } = await supabase
    .from("messages")
    .select("id, team_member_id, service_id, gig_name, received_date, status, team_member:team_members(id, full_name)")
    .order("received_date", { ascending: false });

  const related = (messages ?? []).filter((m) => messageMatchesService(m, service));

  function getMember(msg: (typeof related)[number]) {
    const tm = msg.team_member;
    if (!tm) return null;
    if (Array.isArray(tm)) return (tm[0] as { id: string; full_name: string } | undefined) ?? null;
    return tm as { id: string; full_name: string };
  }

  const byMember = new Map<string, MemberGroup>();
  for (const msg of related) {
    const member = getMember(msg);
    if (!member) continue;

    let group = byMember.get(member.id);
    if (!group) {
      group = {
        id: member.id,
        full_name: member.full_name,
        messageCount: 0,
        lastDate: msg.received_date,
        gigs: [],
        messages: [],
      };
      byMember.set(member.id, group);
    }

    group.messageCount++;
    group.messages.push({
      id: msg.id,
      received_date: msg.received_date,
      gig_name: msg.gig_name,
      status: msg.status,
    });

    const label = getMessageServiceLabel(msg);
    if (label !== "—" && !group.gigs.includes(label)) {
      group.gigs.push(label);
    }
  }

  const members = [...byMember.values()].sort((a, b) => b.messageCount - a.messageCount);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/services"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-brand-green mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Services
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">{service.name}</h1>
            {service.description && (
              <p className="text-neutral-500 mt-1">{service.description}</p>
            )}
            <p className="text-sm text-neutral-400 mt-2">
              {related.length} message{related.length === 1 ? "" : "s"} across{" "}
              {members.length} team member{members.length === 1 ? "" : "s"}
            </p>
          </div>
          <Badge variant={service.is_active ? "success" : "neutral"}>
            {service.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
      </div>

      {members.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <MessageSquare className="h-12 w-12 text-neutral-300 mb-4" />
            <p className="text-neutral-600 font-medium">No related messages yet</p>
            <p className="text-sm text-neutral-400 mt-1 max-w-md">
              When team members receive messages linked to this category, they will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-brand-green" />
            Team members with messages
          </h2>

          <div className="grid gap-4">
            {members.map((member) => (
              <Link key={member.id} href={`/team-members/${member.id}?tab=messages`}>
                <Card className="transition-all hover:border-brand-green/40 hover:shadow-md cursor-pointer">
                  <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-neutral-900">{member.full_name}</h3>
                        <p className="text-sm text-neutral-500 mt-0.5">
                          Last message · {formatDate(member.lastDate)}
                        </p>
                      </div>
                      <Badge variant="neutral" className="w-fit">
                        {member.messageCount} message{member.messageCount === 1 ? "" : "s"}
                      </Badge>
                    </div>

                    {member.gigs.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {member.gigs.slice(0, 6).map((gig) => (
                          <span
                            key={gig}
                            className="text-xs bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full"
                          >
                            {gig}
                          </span>
                        ))}
                        {member.gigs.length > 6 && (
                          <span className="text-xs text-neutral-400 px-1">
                            +{member.gigs.length - 6} more
                          </span>
                        )}
                      </div>
                    )}

                    <div className="mt-4 border-t pt-3">
                      <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-2">
                        Recent messages
                      </p>
                      <ul className="space-y-1.5">
                        {member.messages.slice(0, 3).map((msg) => (
                          <li
                            key={msg.id}
                            className="flex items-center justify-between text-sm text-neutral-600"
                          >
                            <span className="truncate pr-2">
                              {msg.gig_name ?? "—"}
                            </span>
                            <span className="shrink-0 text-neutral-400">
                              {formatDate(msg.received_date)}
                              {" · "}
                              {MESSAGE_STATUS_LABELS[msg.status as keyof typeof MESSAGE_STATUS_LABELS] ?? msg.status}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
