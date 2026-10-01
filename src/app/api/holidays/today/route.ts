import { NextResponse } from "next/server";
import { lagosToday } from "@/lib/celebrations/calendar";

export interface TodayHoliday {
  date: string;
  name: string;
}

/** Nigerian public holidays falling on today's Lagos date, from Nager.Date (free, no key). */
export async function GET() {
  const today = lagosToday();
  try {
    const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${today.year}/NG`, {
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!res.ok) throw new Error(`Nager.Date returned ${res.status}`);
    const all = (await res.json()) as { date: string; name: string }[];
    const holidays: TodayHoliday[] = all
      .filter((h) => h.date === today.ymd)
      .map((h) => ({ date: h.date, name: h.name }));
    return NextResponse.json({ date: today.ymd, holidays, live: true });
  } catch (err) {
    console.error("Holiday fetch failed:", err);
    return NextResponse.json({ date: today.ymd, holidays: [], live: false });
  }
}
