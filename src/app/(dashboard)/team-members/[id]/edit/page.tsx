import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TeamMemberForm } from "@/components/members/team-member-form";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditTeamMemberPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: member } = await supabase.from("team_members").select("*").eq("id", id).single();
  if (!member) notFound();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-neutral-900">Edit Team Member</h1>
      <p className="text-neutral-500 text-sm">Correct any mistakes in member details.</p>
      <TeamMemberForm mode="edit" member={member} />
    </div>
  );
}
