import Link from "next/link";
import { redirect } from "next/navigation";
import { getUserScope } from "@/lib/auth/scope";
import { MemberMyFinesPanel } from "@/components/members/member-my-fines-panel";
import { SuperAdminStar } from "@/components/shared/super-admin-star";
import { Button } from "@/components/ui/button";

export default async function MyFinesPage() {
  const scope = await getUserScope();
  if (!scope) redirect("/login");

  const isSuperAdmin = scope.roleSlugs.includes("super_admin");
  const member = scope.teamMember;

  if (!member) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center space-y-4">
        <h1 className="text-xl font-bold text-neutral-900">No team profile linked</h1>
        <p className="text-neutral-500 text-sm">
          {isSuperAdmin
            ? "To see fines issued to you personally, your login must be linked to a team member record (same as other members)."
            : "Your login is not linked to a team member profile yet. Contact your admin."}
        </p>
        {isSuperAdmin && (
          <Link href="/team-members">
            <Button variant="secondary">Open team members</Button>
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        {isSuperAdmin && (
          <p className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-bold text-amber-800 mb-2">
            <SuperAdminStar size="sm" />
            Your personal fines
          </p>
        )}
        <h1 className="text-2xl font-bold text-neutral-900">My Fines</h1>
        <p className="text-neutral-500 mt-1">
          Disciplinary fines issued to you — separate from team-wide{" "}
          <Link href="/fines" className="text-brand-green font-medium hover:underline">
            Fines &amp; Debts
          </Link>{" "}
          admin view.
        </p>
      </div>
      <MemberMyFinesPanel teamMemberId={member.id} variant="page" />
    </div>
  );
}
