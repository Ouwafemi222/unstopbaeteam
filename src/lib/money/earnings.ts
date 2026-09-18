/** Fiverr seller service fee (standard platform cut). */
export const FIVERR_SERVICE_FEE_PERCENT = 20;

export type PaymentSource = "fiverr" | "outside";

export const EARNING_CURRENCIES = ["USD", "GBP", "EUR", "NGN"] as const;
export type EarningCurrency = (typeof EARNING_CURRENCIES)[number];

export interface FeeBreakdown {
  gross: number;
  feePercent: number;
  feeAmount: number;
  net: number;
}

/** Deduct Fiverr service fee from a gross payout. */
export function applyFiverrFee(
  gross: number,
  feePercent = FIVERR_SERVICE_FEE_PERCENT
): FeeBreakdown {
  const safeGross = Math.max(0, Number(gross) || 0);
  const feeAmount = Math.round(safeGross * (feePercent / 100) * 100) / 100;
  const net = Math.round((safeGross - feeAmount) * 100) / 100;
  return { gross: safeGross, feePercent, feeAmount, net };
}

/**
 * Convert amount between currencies using GBP-based rates
 * (rates[X] = units of X per 1 GBP).
 */
export function convertWithGbpBaseRates(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, number>
): number {
  if (!amount || fromCurrency === toCurrency) return amount;
  const fromRate = rates[fromCurrency];
  const toRate = rates[toCurrency];
  if (!fromRate || !toRate) return NaN;
  return Math.round(amount * (toRate / fromRate) * 100) / 100;
}

export function formatNgn(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatMoney(amount: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
