import { createClient } from "@/lib/supabase/server";
import type { ActivityAction } from "@/types/database";

export async function logActivity(params: {
  action: ActivityAction;
  entityType: string;
  entityId?: string;
  entityLabel?: string;
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  await supabase.from("activity_logs").insert({
    user_id: user?.id,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId,
    entity_label: params.entityLabel,
    previous_value: params.previousValue,
    new_value: params.newValue,
    metadata: params.metadata,
  });
}
