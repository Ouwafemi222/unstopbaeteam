import { MapPin } from "lucide-react";
import { RelativeTime } from "@/components/shared/relative-time";
import { formatDateTime } from "@/lib/utils";
import type { MemberPresenceLocation } from "@/types/database";

export function MemberPresenceCard({
  presence,
  memberName,
}: {
  presence: MemberPresenceLocation | null;
  memberName: string;
}) {
  if (!presence) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-neutral-200 text-neutral-500 flex items-center justify-center shrink-0">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Last seen location</p>
            <h3 className="font-semibold text-neutral-800 mt-0.5">Not recorded yet</h3>
            <p className="text-sm text-neutral-500 mt-1">
              {memberName} needs to open the website while logged in. Their city is saved from Abstract IP Intelligence.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const place = [presence.city, presence.region, presence.country].filter(Boolean).join(", ");

  return (
    <div className="rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 via-white to-white px-5 py-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
          <MapPin className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Last seen location</p>
          <h3 className="text-lg font-bold text-neutral-900 mt-0.5">
            {presence.flag ? `${presence.flag} ` : ""}
            {place}
          </h3>
          <p className="text-sm text-neutral-500 mt-1">
            Last on the website{" "}
            <RelativeTime iso={presence.last_seen_at} className="font-medium text-neutral-700" />
            {" · "}
            {formatDateTime(presence.last_seen_at)}
          </p>
          {(presence.currency_code || presence.timezone_name) && (
            <p className="text-xs text-neutral-400 mt-1">
              {[presence.currency_code, presence.timezone_name].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
