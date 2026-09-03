"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import type { GeoLocation } from "@/app/api/geo/location/route";

export function LocationBadge() {
  const [loc, setLoc] = useState<GeoLocation | null>(null);

  useEffect(() => {
    fetch("/api/geo/location")
      .then((r) => r.json())
      .then((data: GeoLocation) => {
        if (data?.country) setLoc(data);
      })
      .catch(() => {});
  }, []);

  if (!loc) return null;

  return (
    <div
      className="hidden lg:flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs text-neutral-600"
      title={`Your location: ${loc.city ? loc.city + ", " : ""}${loc.country} · ${loc.timezone?.name ?? ""}`}
    >
      <MapPin className="h-3 w-3 text-neutral-400 shrink-0" />
      <span className="font-medium">{loc.flag} {loc.city || loc.country}</span>
    </div>
  );
}
