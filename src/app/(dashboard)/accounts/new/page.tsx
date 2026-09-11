import { Briefcase } from "lucide-react";
import { AccountForm } from "@/components/accounts/account-form";
import { RecordPageShell } from "@/components/shared/record-page-shell";

export default function NewAccountPage() {
  return (
    <RecordPageShell
      backHref="/accounts"
      backLabel="Back to Accounts"
      title="Add Fiverr Account"
      subtitle="Open a cleaner record flow with clear sections — new accounts also light up the live team stream."
      icon={Briefcase}
      tone="account"
      maxWidthClass="max-w-3xl"
    >
      <AccountForm mode="create" />
    </RecordPageShell>
  );
}
