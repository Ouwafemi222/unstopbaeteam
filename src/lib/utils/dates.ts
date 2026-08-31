import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
  format,
} from "date-fns";
import { toZonedTime } from "date-fns-tz";
import type { DateFilter, DateRange } from "@/types/database";

const TZ = "Africa/Lagos";

export function getDateRange(filter: DateFilter, custom?: DateRange): { from: string; to: string } {
  const now = toZonedTime(new Date(), TZ);

  switch (filter) {
    case "today":
      return {
        from: format(startOfDay(now), "yyyy-MM-dd"),
        to: format(endOfDay(now), "yyyy-MM-dd"),
      };
    case "this_week":
      return {
        from: format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
        to: format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
      };
    case "this_month":
      return {
        from: format(startOfMonth(now), "yyyy-MM-dd"),
        to: format(endOfMonth(now), "yyyy-MM-dd"),
      };
    case "last_month": {
      const lastMonth = subMonths(now, 1);
      return {
        from: format(startOfMonth(lastMonth), "yyyy-MM-dd"),
        to: format(endOfMonth(lastMonth), "yyyy-MM-dd"),
      };
    }
    case "custom":
      if (custom) {
        return {
          from: format(custom.from, "yyyy-MM-dd"),
          to: format(custom.to, "yyyy-MM-dd"),
        };
      }
      return { from: "1970-01-01", to: format(now, "yyyy-MM-dd") };
    default:
      return { from: "1970-01-01", to: format(now, "yyyy-MM-dd") };
  }
}

export function getMonthYear(date?: Date): { month: number; year: number } {
  const d = date ? toZonedTime(date, TZ) : toZonedTime(new Date(), TZ);
  return { month: d.getMonth() + 1, year: d.getFullYear() };
}

export function getPerformanceStatus(
  current: number,
  previous: number,
  isNewMember: boolean
): "improving" | "stable" | "needs_attention" | "no_messages" | "new_member" {
  if (isNewMember) return "new_member";
  if (current === 0 && previous === 0) return "no_messages";
  if (current === 0 && previous > 0) return "needs_attention";
  if (current > previous) return "improving";
  if (current === previous) return "stable";
  return "needs_attention";
}

export const ACCOUNT_STATUS_LABELS: Record<string, string> = {
  active: "Active",
  new: "New",
  pending_setup: "Pending Setup",
  verification_pending: "Verification Pending",
  verified: "Verified",
  restricted: "Restricted",
  disabled: "Disabled",
  suspended: "Suspended",
  closed: "Closed",
  archived: "Archived",
};

export const MESSAGE_STATUS_LABELS: Record<string, string> = {
  new: "New",
  replied: "Replied",
  qualified: "Qualified",
  not_qualified: "Not Qualified",
  converted_to_order: "Converted To Order",
  follow_up: "Follow-Up",
  closed: "Closed",
};

export const MEMBER_STATUS_LABELS: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
  on_leave: "On Leave",
  archived: "Archived",
};
