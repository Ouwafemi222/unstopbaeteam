"use client";

import { useEffect, useState } from "react";
import { TrendingUp, RefreshCw, ArrowRightLeft } from "lucide-react";
import type { ExchangeRates } from "@/app/api/currency/rates/route";

interface CurrencyRatesWidgetProps {
  variant?: "banner" | "card" | "compact";
}

export function CurrencyRatesWidget({ variant = "card" }: CurrencyRatesWidgetProps) {
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function fetchRates() {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/currency/rates");
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setRates(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRates();
    // Refresh every hour
    const id = setInterval(fetchRates, 60 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  const ngn = rates?.rates.NGN;
  const usd = rates?.rates.USD;

  if (variant === "compact") {
    if (loading) return <span className="text-xs text-neutral-400 animate-pulse">Loading rates…</span>;
    if (error || !ngn) return null;
    return (
      <span className="text-xs font-medium text-neutral-600">
        £1 = ₦{ngn.toLocaleString("en-NG", { maximumFractionDigits: 0 })}
      </span>
    );
  }

  if (variant === "banner") {
    return (
      <div className="flex items-center gap-4 rounded-xl border border-emerald-200/60 bg-gradient-to-r from-emerald-50/80 to-white px-5 py-3 text-sm">
        <div className="flex items-center gap-1.5 text-emerald-700">
          <TrendingUp className="h-4 w-4" />
          <span className="font-semibold text-xs uppercase tracking-wide">Live Rates</span>
        </div>
        {loading ? (
          <div className="flex gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-4 w-28 animate-pulse rounded bg-neutral-200" />
            ))}
          </div>
        ) : error ? (
          <span className="text-neutral-400 text-xs">Rates unavailable</span>
        ) : (
          <div className="flex flex-wrap gap-4">
            <RatePill from="£1 GBP" to={`₦${ngn?.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`} color="green" />
            <RatePill from="$1 USD" to={`₦${((ngn ?? 0) / (usd ?? 1)).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`} color="blue" />
            <RatePill from="£1 GBP" to={`$${usd?.toFixed(2)}`} color="amber" />
          </div>
        )}
        <button
          onClick={fetchRates}
          title="Refresh rates"
          className="ml-auto text-neutral-400 hover:text-emerald-600 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>
    );
  }

  // card variant (default)
  return (
    <div className="rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50 via-white to-teal-50/30 overflow-hidden">
      <div className="px-5 py-4 flex items-center justify-between border-b border-emerald-100">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
            <ArrowRightLeft className="h-4 w-4 text-emerald-700" />
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-900">Live Exchange Rates</p>
            <p className="text-xs text-neutral-400">
              {rates?.fetched_at
                ? `Updated ${new Date(rates.fetched_at).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos" })}`
                : "GBP base"}
            </p>
          </div>
        </div>
        <button
          onClick={fetchRates}
          title="Refresh"
          className="text-neutral-400 hover:text-emerald-600 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading ? (
        <div className="p-5 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-neutral-100" />
          ))}
        </div>
      ) : error ? (
        <div className="p-5 text-center text-sm text-neutral-400">
          <p>Could not load rates.</p>
          <button onClick={fetchRates} className="mt-2 text-emerald-600 hover:underline text-xs">Try again</button>
        </div>
      ) : (
        <div className="p-4 grid grid-cols-1 gap-3">
          <RateRow
            flag="🇬🇧"
            from="1 GBP"
            to={`₦${ngn?.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`}
            label="British Pound → Naira"
            color="emerald"
          />
          <RateRow
            flag="🇺🇸"
            from="1 USD"
            to={`₦${((ngn ?? 0) / (usd ?? 1)).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`}
            label="US Dollar → Naira"
            color="blue"
          />
          <RateRow
            flag="🇬🇧"
            from="1 GBP"
            to={`$${usd?.toFixed(2)}`}
            label="British Pound → USD"
            color="amber"
          />
        </div>
      )}

      {rates && (
        <p className="text-center text-xs text-neutral-400 pb-3">
          Next update: {new Date(rates.next_update).toLocaleDateString("en-NG", { timeZone: "Africa/Lagos", day: "numeric", month: "short" })}
          {" "}· powered by ExchangeRate-API
        </p>
      )}
    </div>
  );
}

function RatePill({ from, to, color }: { from: string; to: string; color: "green" | "blue" | "amber" }) {
  const colors = {
    green: "bg-emerald-100 text-emerald-800",
    blue: "bg-blue-100 text-blue-800",
    amber: "bg-amber-100 text-amber-800",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors[color]}`}>
      {from} → {to}
    </span>
  );
}

function RateRow({
  flag, from, to, label, color,
}: {
  flag: string;
  from: string;
  to: string;
  label: string;
  color: "emerald" | "blue" | "amber";
}) {
  const bg = { emerald: "bg-emerald-50 border-emerald-100", blue: "bg-blue-50 border-blue-100", amber: "bg-amber-50 border-amber-100" };
  const text = { emerald: "text-emerald-900", blue: "text-blue-900", amber: "text-amber-900" };
  return (
    <div className={`flex items-center justify-between rounded-xl border px-4 py-3 ${bg[color]}`}>
      <div>
        <p className="text-xs text-neutral-500">{label}</p>
        <p className="text-sm font-medium text-neutral-700">{from}</p>
      </div>
      <div className="text-right">
        <span className={`text-xl font-bold tabular-nums ${text[color]}`}>{to}</span>
        <p className="text-xs text-neutral-400">{flag}</p>
      </div>
    </div>
  );
}
