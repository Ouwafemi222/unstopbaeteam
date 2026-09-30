import { redirect } from "next/navigation";
import { getUserScope } from "@/lib/auth/scope";
import { TeamBlueprintPage } from "@/components/team-blueprint/team-blueprint-page";

export default async function TeamBlueprintRoute() {
  const scope = await getUserScope();
  if (!scope) redirect("/login");

  const memberName =
    scope.teamMember?.preferred_name ||
    scope.teamMember?.full_name ||
    scope.user.profile?.preferred_name ||
    scope.user.profile?.full_name;

  return (
    <TeamBlueprintPage memberName={memberName} />
  );
}
