import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AccountForm } from "@/components/accounts/account-form";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditAccountPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: account } = await supabase
    .from("fiverr_accounts")
    .select("*")
    .eq("id", id)
    .single();

  if (!account) notFound();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-neutral-900">Edit Fiverr Account</h1>
      <p className="text-neutral-500 text-sm">Update account details if a mistake was made.</p>
      <AccountForm mode="edit" account={account} />
    </div>
  );
}
