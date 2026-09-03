"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import type { GeoLocation } from "@/app/api/geo/location/route";

export function LocationBadge() {
  const [loc, setLoc] = useState<GeoLocation | null>(null);

  useEffect(() => {
    fetch("/api/geo/location", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: GeoLocation) => {
        if (data?.country) setLoc(data);
      })
      .catch(() => {});
  }, []);

  if (!loc) return null;

  const label = [loc.city, loc.country].filter(Boolean).join(", ");

  return (
    <div
      className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs text-neutral-600 max-w-[11rem] sm:max-w-none"
      title={`You appear to be in ${label}${loc.timezone?.name ? ` · ${loc.timezone.name}` : ""}`}
    >
      <MapPin className="h-3 w-3 text-neutral-400 shrink-0" />
      <span className="font-medium truncate">
        {loc.flag ? `${loc.flag} ` : ""}
        {loc.city || loc.country}
      </span>
    </div>
  );
}
