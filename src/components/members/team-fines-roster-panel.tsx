import Link from "next/link";
import { AlertTriangle, CheckCircle2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { TeamMemberFineRosterRow } from "@/lib/members/team-fines-roster";

interface TeamFinesRosterPanelProps {
  roster: TeamMemberFineRosterRow[];
  currentMemberId?: string | null;
  variant?: "page" | "embedded";
}

export function TeamFinesRosterPanel({
  roster,
  currentMemberId,
  variant = "page",
}: TeamFinesRosterPanelProps) {
  const isEmbedded = variant === "embedded";

  if (roster.length === 0) {
    return (
      <Card className={isEmbedded ? "border-dashed" : undefined}>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center px-6">
          <CheckCircle2 className="h-10 w-10 text-emerald-500 mb-3" />
          <p className="font-semibold text-neutral-900">No active team fines</p>
          <p className="text-sm text-neutral-500 mt-1 max-w-md">
            No team member currently has an unpaid disciplinary fine on record.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {!isEmbedded && (
        <p className="text-sm text-neutral-600">
          Names only — fine amounts and reasons stay private. Open{" "}
          <Link href="/my-fines" className="text-brand-green font-medium hover:underline">
            My Fines
          </Link>{" "}
          to see your own details.
        </p>
      )}

      <div className="responsive-table bg-white rounded-xl border shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-neutral-500 bg-neutral-50">
              <th className="p-3 font-medium">Team member</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium text-right">Active fines</th>
            </tr>
          </thead>
          <tbody>
            {roster.map((row) => {
              const isYou = currentMemberId === row.teamMemberId;
              return (
                <tr
                  key={row.teamMemberId}
                  className={`border-b ${isYou ? "bg-amber-50/50" : "hover:bg-neutral-50/80"}`}
                >
                  <td className="p-3 font-medium text-neutral-900">
                    <span className="inline-flex items-center gap-2">
                      <Users className="h-4 w-4 text-neutral-400 shrink-0" />
                      {row.fullName}
                      {isYou ? (
                        <Badge variant="warning" className="text-[10px]">
                          You
                        </Badge>
                      ) : null}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-1.5 text-amber-800">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Unpaid fine
                    </span>
                  </td>
                  <td className="p-3 text-right tabular-nums font-semibold text-neutral-800">
                    {row.activeFineCount}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {currentMemberId && roster.some((r) => r.teamMemberId === currentMemberId) && (
        <div className="flex justify-end">
          <Link href="/my-fines">
            <Button size="sm" variant="secondary">
              View my fine details
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
