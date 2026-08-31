import { redirect } from "next/navigation";
import { getUserScope } from "@/lib/auth/scope";
import { MemberMessagesPanel } from "@/components/messages/member-messages-panel";

export default async function MyMessagesPage() {
  const scope = await getUserScope();
  if (!scope) redirect("/login");

  const member = scope.teamMember;
  if (!member) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center">
        <h1 className="text-xl font-bold text-neutral-900">No team profile linked</h1>
        <p className="text-neutral-500 mt-2 text-sm">Complete registration at /join to link your profile.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">My Messages</h1>
        <p className="text-neutral-500 mt-1">
          Record every Fiverr message you receive — date, gig, service, and account.
        </p>
      </div>
      <MemberMessagesPanel
        memberId={member.id}
        memberName={member.full_name}
        basePath="/my-messages"
        showTitle={false}
      />
    </div>
  );
}
