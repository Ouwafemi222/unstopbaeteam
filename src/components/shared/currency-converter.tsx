"use client";

import { useEffect, useState } from "react";
import { ArrowRightLeft, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { ExchangeRates } from "@/app/api/currency/rates/route";
import type { GeoLocation } from "@/app/api/geo/location/route";

const CURRENCIES = [
  { code: "GBP", symbol: "£", flag: "🇬🇧", label: "British Pound" },
  { code: "NGN", symbol: "₦", flag: "🇳🇬", label: "Nigerian Naira" },
  { code: "USD", symbol: "$", flag: "🇺🇸", label: "US Dollar" },
];

// Map detected currency codes to our supported ones
function mapCurrencyCode(code: string): string {
  if (code === "GBP") return "GBP";
  if (code === "NGN") return "NGN";
  if (code === "USD") return "USD";
  return "NGN"; // default to NGN for unsupported currencies
}

export function CurrencyConverter() {
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("1");
  const [from, setFrom] = useState("GBP");
  const [to, setTo] = useState("NGN");
  const [locationLabel, setLocationLabel] = useState<string | null>(null);

  useEffect(() => {
    // Load rates
    fetch("/api/currency/rates")
      .then((r) => r.json())
      .then((data) => { if (data?.rates) setRates(data); })
      .finally(() => setLoading(false));

    // Auto-set "to" currency based on user's location
    fetch("/api/geo/location")
      .then((r) => r.json())
      .then((geo: GeoLocation) => {
        if (!geo?.country) return;
        const code =
          geo.currency?.currency_code ||
          (geo.country_code === "NG" ? "NGN" : geo.country_code === "GB" ? "GBP" : "USD");
        const detected = mapCurrencyCode(code);
        if (detected === "GBP") {
          setFrom("NGN");
          setTo("GBP");
        } else {
          setFrom("GBP");
          setTo(detected);
        }
        setLocationLabel(`${geo.flag ? geo.flag + " " : ""}${geo.city || geo.country}`);
      })
      .catch(() => {});
  }, []);

  function getRate(fromCode: string, toCode: string): number {
    if (!rates) return 0;
    // rates are GBP-based: rates.rates[X] = how many X per 1 GBP
    const fromRate = rates.rates[fromCode] ?? 1;
    const toRate = rates.rates[toCode] ?? 1;
    return toRate / fromRate;
  }

  function swap() {
    setFrom(to);
    setTo(from);
  }

  const numAmount = parseFloat(amount) || 0;
  const rate = getRate(from, to);
  const converted = numAmount * rate;

  const fromCurrency = CURRENCIES.find((c) => c.code === from)!;
  const toCurrency = CURRENCIES.find((c) => c.code === to)!;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-4">
      <div className="flex items-center gap-2">
        <ArrowRightLeft className="h-5 w-5 text-emerald-600" />
        <h3 className="font-semibold text-neutral-900">Currency Converter</h3>
        {locationLabel && (
          <span className="ml-auto text-xs text-neutral-400 font-medium">{locationLabel}</span>
        )}
        {loading && !locationLabel && <Loader2 className="h-4 w-4 animate-spin text-neutral-400 ml-auto" />}
      </div>

      {/* From */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Amount</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-semibold">
              {fromCurrency.symbol}
            </span>
            <Input
              type="number"
              min="0"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="pl-8 text-lg font-bold"
            />
          </div>
          <select
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Swap button */}
      <div className="flex justify-center">
        <button
          onClick={swap}
          className="h-9 w-9 rounded-full border-2 border-emerald-200 bg-emerald-50 flex items-center justify-center text-emerald-700 hover:bg-emerald-100 transition-colors"
        >
          <ArrowRightLeft className="h-4 w-4" />
        </button>
      </div>

      {/* To */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Converted to</label>
        <div className="flex gap-2">
          <div className="flex-1 rounded-lg border border-neutral-100 bg-emerald-50 px-4 py-3 flex items-center gap-2">
            <span className="text-emerald-600 font-semibold text-lg">{toCurrency.symbol}</span>
            <span className="text-2xl font-extrabold text-emerald-900 tabular-nums">
              {loading ? "—" : converted.toLocaleString("en-NG", {
                minimumFractionDigits: to === "NGN" ? 0 : 2,
                maximumFractionDigits: to === "NGN" ? 0 : 2,
              })}
            </span>
          </div>
          <select
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Rate info */}
      {!loading && rates && (
        <p className="text-center text-xs text-neutral-400">
          1 {from} = {rate.toLocaleString("en-NG", { maximumFractionDigits: 2 })} {to}
          {" "}&bull;{" "}
          Updated daily via ExchangeRate-API
        </p>
      )}
    </div>
  );
}

/** Inline helper: shows "= ₦XX,XXX" next to a GBP amount */
export function GbpToNgn({ gbp, className }: { gbp: number; className?: string }) {
  const [ngn, setNgn] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/currency/rates")
      .then((r) => r.json())
      .then((data: ExchangeRates) => setNgn(gbp * data.rates.NGN))
      .catch(() => {});
  }, [gbp]);

  if (!ngn) return null;
  return (
    <span className={className ?? "text-xs text-neutral-400"}>
      ≈ ₦{ngn.toLocaleString("en-NG", { maximumFractionDigits: 0 })}
    </span>
  );
}
