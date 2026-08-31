import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";

export default async function ActivityPage() {
  const supabase = await createClient();

  const { data: logs } = await supabase
    .from("activity_logs")
    .select("*, profile:profiles(full_name)")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Activity Log</h1>
        <p className="text-neutral-500 mt-1">Audit trail of all system actions</p>
      </div>

      <div className="space-y-2">
        {logs?.length === 0 ? (
          <p className="text-neutral-500">No activity recorded yet.</p>
        ) : logs?.map((log) => (
          <div key={log.id} className="flex items-center gap-4 p-4 bg-white rounded-lg border text-sm">
            <Badge variant="neutral">{log.action}</Badge>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-neutral-900 truncate">{log.entity_label ?? log.entity_type}</p>
              <p className="text-xs text-neutral-400">{log.entity_type}</p>
            </div>
            <span className="text-neutral-600 shrink-0">{(log.profile as { full_name: string })?.full_name ?? "System"}</span>
            <span className="text-neutral-400 shrink-0 text-xs">{formatDateTime(log.created_at)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
