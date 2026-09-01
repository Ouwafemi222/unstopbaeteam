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
