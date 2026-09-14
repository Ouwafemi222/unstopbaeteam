import { formatYearMonthLabel } from "@/lib/utils/dates";

export interface MonthWeek {
  week: number;
  start: number;
  end: number;
  label: string;
}

/** Split a calendar month into week 1–N blocks (7-day chunks). */
export function getWeeksInMonth(yearMonth: string): MonthWeek[] {
  const [y, m] = yearMonth.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const monthName = formatYearMonthLabel(yearMonth).split(" ")[0];
  const weeks: MonthWeek[] = [];

  for (let start = 1, week = 1; start <= lastDay; start += 7, week++) {
    const end = Math.min(start + 6, lastDay);
    weeks.push({
      week,
      start,
      end,
      label: `Week ${week} (${monthName} ${start}–${end})`,
    });
  }

  return weeks;
}

/** Map YYYY-MM-DD to year_month + week number used by weekly reports. */
export function weekForCalendarDate(isoDate: string): { yearMonth: string; week: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (!year || !month || !day || day < 1 || day > 31) return null;
  const yearMonth = `${m[1]}-${m[2]}`;
  const week = Math.floor((day - 1) / 7) + 1;
  return { yearMonth, week };
}
