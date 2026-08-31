import { AccountForm } from "@/components/accounts/account-form";

export default function NewAccountPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-neutral-900">Add Fiverr Account</h1>
      <AccountForm mode="create" />
    </div>
  );
}
