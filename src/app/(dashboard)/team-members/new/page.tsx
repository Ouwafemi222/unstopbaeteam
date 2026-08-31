import { TeamMemberForm } from "@/components/members/team-member-form";

export default function NewTeamMemberPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-neutral-900">Add Team Member</h1>
      <TeamMemberForm mode="create" />
    </div>
  );
}
