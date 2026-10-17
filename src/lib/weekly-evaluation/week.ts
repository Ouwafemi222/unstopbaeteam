import { parseISO, subDays } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

const TZ = "Africa/Lagos";

export function lagosToday(now = new Date()): string {
  return formatInTimeZone(now, TZ, "yyyy-MM-dd");
}

/** Seven days ending today in Lagos. A Friday send covers the previous Saturday through Friday. */
export function currentPublishWindow(now = new Date()): { weekStart: string; weekEnd: string } {
  const weekEnd = lagosToday(now);
  const endNoon = fromZonedTime(`${weekEnd}T12:00:00`, TZ);
  const weekStart = formatInTimeZone(subDays(endNoon, 6), TZ, "yyyy-MM-dd");
  return { weekStart, weekEnd };
}

export function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

export function formatSheetDay(isoDate: string, pattern = "d MMM yyyy"): string {
  return formatInTimeZone(parseISO(`${isoDate}T12:00:00Z`), TZ, pattern);
}

export function formatSheetRange(weekStart: string, weekEnd: string): string {
  return `${formatSheetDay(weekStart, "d MMM")} – ${formatSheetDay(weekEnd)}`;
}

export function lagosDayStartIso(isoDate: string): string {
  return fromZonedTime(`${isoDate}T00:00:00`, TZ).toISOString();
}

export function lagosDayEndIso(isoDate: string): string {
  return fromZonedTime(`${isoDate}T23:59:59.999`, TZ).toISOString();
}
