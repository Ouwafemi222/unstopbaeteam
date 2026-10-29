import { Star } from "lucide-react";
import { redirect } from "next/navigation";
import { getUserScope } from "@/lib/auth/scope";
import { FiveStarForm } from "@/components/incentives/five-star-form";
import { RecordPageShell } from "@/components/shared/record-page-shell";

export default async function MyStarsNewPage() {
  const scope = await getUserScope();
  if (!scope?.teamMember) redirect("/login");

  return (
    <RecordPageShell
      backHref="/my-stars"
      backLabel="Back to My 5 Stars"
      title="Record a 5-star review"
      subtitle="Save the screenshot from Fiverr. That picture is what counts toward the incentive."
      icon={Star}
      tone="account"
    >
      <FiveStarForm teamMemberId={scope.teamMember.id} returnTo="/my-stars" />
    </RecordPageShell>
  );
}
