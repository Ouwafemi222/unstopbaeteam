import { ACCOUNT_STATUS_LABELS } from "@/lib/utils/dates";
import { Badge } from "@/components/ui/badge";
import type { AccountStatus } from "@/types/database";

const statusVariant: Record<AccountStatus, "success" | "warning" | "danger" | "info" | "neutral" | "default"> = {
  active: "success",
  new: "info",
  pending_setup: "warning",
  verification_pending: "warning",
  verified: "success",
  restricted: "danger",
  disabled: "danger",
  suspended: "danger",
  closed: "neutral",
  archived: "neutral",
};

export function AccountStatusBadge({ status }: { status: AccountStatus }) {
  return (
    <Badge variant={statusVariant[status] ?? "neutral"}>
      {ACCOUNT_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
