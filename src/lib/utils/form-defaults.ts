import { formatInTimeZone } from "date-fns-tz";

const TZ = "Africa/Lagos";

/** Today's date as YYYY-MM-DD in Lagos timezone */
export function getTodayDate(): string {
  return formatInTimeZone(new Date(), TZ, "yyyy-MM-dd");
}

/** Current time as HH:mm in Lagos timezone */
export function getCurrentTime(): string {
  return formatInTimeZone(new Date(), TZ, "HH:mm");
}

/** Yesterday's date as YYYY-MM-DD in Lagos timezone */
export function getYesterdayDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return formatInTimeZone(d, TZ, "yyyy-MM-dd");
}

/** First day of current month */
export function getFirstOfMonth(): string {
  const d = new Date();
  return formatInTimeZone(d, TZ, "yyyy-MM-01");
}
