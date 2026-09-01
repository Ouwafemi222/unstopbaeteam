import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { activityTypeLabel, type MemberActivityItem } from "@/lib/members/activity-feed";
import { Briefcase, MessageSquare, DollarSign, Target, BarChart3 } from "lucide-react";

const iconMap = {
  account: Briefcase,
  message: MessageSquare,
  earning: DollarSign,
  monthly_plan: Target,
  milestone: BarChart3,
};

interface MemberActivityFeedProps {
  items: MemberActivityItem[];
  emptyMessage?: string;
}

export function MemberActivityFeed({ items, emptyMessage }: MemberActivityFeedProps) {
  if (items.length === 0) {
    return (
      <p className="text-neutral-500 text-sm py-6 text-center">
        {emptyMessage ?? "No activity recorded yet. Add accounts, messages, or earnings to see activity here."}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const Icon = iconMap[item.type] ?? BarChart3;
        return (
          <div
            key={item.id}
            className="flex items-start gap-3 p-3 bg-white rounded-lg border text-sm hover:border-brand-green/30 transition-colors"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="neutral">{activityTypeLabel(item.type)}</Badge>
                <span className="font-medium text-neutral-900">{item.label}</span>
              </div>
              {item.detail && (
                <p className="text-neutral-500 mt-0.5 truncate">{item.detail}</p>
              )}
            </div>
            <span className="text-neutral-400 text-xs whitespace-nowrap shrink-0">
              {formatDateTime(item.created_at)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
