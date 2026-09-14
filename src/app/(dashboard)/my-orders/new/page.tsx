import { redirect } from "next/navigation";
import { Trophy } from "lucide-react";
import { getUserScope } from "@/lib/auth/scope";
import { OrderForm } from "@/components/orders/order-form";
import { RecordPageShell } from "@/components/shared/record-page-shell";

export default async function MyOrdersNewPage() {
  const scope = await getUserScope();
  if (!scope?.teamMember) redirect("/login");

  const member = scope.teamMember;

  return (
    <RecordPageShell
      backHref="/my-orders"
      backLabel="Back to Orders Received"
      title="Record Order Received"
      subtitle="You closed it — log the win. Your teammates will see it slide across every dashboard."
      icon={Trophy}
      tone="message"
      maxWidthClass="max-w-2xl"
    >
      <OrderForm
        lockedTeamMemberId={member.id}
        lockedTeamMemberName={member.full_name}
        returnTo="/my-orders"
      />
    </RecordPageShell>
  );
}
