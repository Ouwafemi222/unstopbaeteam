"use client";

import { useEffect, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import type { GeoLocation } from "@/app/api/geo/location/route";

export function LocationCard() {
  const [loc, setLoc] = useState<GeoLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/geo/location")
      .then(async (r) => {
        const data = await r.json();
        if (data?.country) setLoc(data);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="rounded-2xl border border-sky-200/70 bg-gradient-to-br from-sky-50 via-white to-white px-5 py-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
          <MapPin className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Your location</p>
          {loading ? (
            <p className="text-sm text-neutral-500 mt-1 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Detecting from your IP…
            </p>
          ) : error || !loc ? (
            <p className="text-sm text-neutral-500 mt-1">Could not detect location yet. Refresh after a minute.</p>
          ) : (
            <>
              <h3 className="text-lg font-bold text-neutral-900 mt-0.5">
                {loc.flag} {loc.city ? `${loc.city}, ` : ""}
                {loc.country}
              </h3>
              <p className="text-sm text-neutral-500 mt-1">
                {loc.currency?.currency_code
                  ? `Local currency: ${loc.currency.currency_code}`
                  : "Used to set your converter default"}
                {loc.timezone?.name ? ` · ${loc.timezone.name}` : ""}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
