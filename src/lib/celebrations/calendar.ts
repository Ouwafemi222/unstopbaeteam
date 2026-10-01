const TZ = "Africa/Lagos";

export type LagosToday = {
  /** YYYY-MM-DD */
  ymd: string;
  month: number;
  day: number;
  isMonday: boolean;
  monthName: string;
  year: number;
};

export function lagosToday(now = new Date()): LagosToday {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";

  const year = Number(get("year"));
  const month = Number(get("month"));
  const day = Number(get("day"));
  const monthName = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, month: "long" }).format(now);

  return {
    ymd: `${get("year")}-${get("month")}-${get("day")}`,
    month,
    day,
    isMonday: get("weekday") === "Mon",
    monthName,
    year,
  };
}

/** YYYY-MM-DD in Lagos, `days` before today. */
export function lagosDateDaysAgo(days: number, now = new Date()): string {
  return lagosToday(new Date(now.getTime() - days * 24 * 60 * 60 * 1000)).ymd;
}

export type Celebration = {
  id: string;
  emoji: string;
  title: string;
  body: string;
};

const INDEPENDENCE_DAY: Omit<Celebration, "id"> = {
  emoji: "🇳🇬",
  title: "Happy Independence Day!",
  body: "Happy Independence Day, Nigeria! Celebrate today, then keep building the freedom your hustle gives you.",
};

/** Friendly copy for holiday names returned by Nager.Date for Nigeria. */
const HOLIDAY_COPY: Record<string, Omit<Celebration, "id">> = {
  "National Day": INDEPENDENCE_DAY,
  "New Year's Day": {
    emoji: "🎆",
    title: "Happy New Year!",
    body: "A brand-new year to win big. Set your goals today and let's make this our best year as a team.",
  },
  "Good Friday": {
    emoji: "✝️",
    title: "Blessed Good Friday!",
    body: "Wishing you and your family a peaceful and blessed Good Friday.",
  },
  "Easter Monday": {
    emoji: "🐣",
    title: "Happy Easter!",
    body: "Happy Easter from the whole team. Rest well, and come back ready to rise.",
  },
  "Workers' Day": {
    emoji: "🛠️",
    title: "Happy Workers' Day!",
    body: "Every message and every account counts. Thank you for the work you put in — enjoy your day.",
  },
  "Children's Day": {
    emoji: "🧒",
    title: "Happy Children's Day!",
    body: "Happy Children's Day! Keep building a future the next generation can be proud of.",
  },
  "Democracy Day": {
    emoji: "🗳️",
    title: "Happy Democracy Day!",
    body: "Happy Democracy Day, Nigeria! Your voice matters — and so does your hustle.",
  },
  "National Youth Day": {
    emoji: "💪",
    title: "Happy Youth Day!",
    body: "Young, hungry, and unstoppable. Happy National Youth Day to the team!",
  },
  "Christmas Day": {
    emoji: "🎄",
    title: "Merry Christmas!",
    body: "Merry Christmas from UNSTOPPABLE TEAM. Enjoy the day with the people you love.",
  },
  "Boxing Day": {
    emoji: "🎁",
    title: "Happy Boxing Day!",
    body: "Happy Boxing Day! Rest up — a strong finish to the year is still in reach.",
  },
};

/** Used when the live holiday service is unreachable. Keyed by MM-DD. */
const FALLBACK_HOLIDAYS: Record<string, Omit<Celebration, "id">> = {
  "10-01": INDEPENDENCE_DAY,
};

export type LiveHoliday = { date: string; name: string };

/** Celebrations for today, in the order they should pop up. Pass `null` holidays if the live lookup failed. */
export function celebrationsFor(
  today: LagosToday,
  firstName: string,
  liveHolidays: LiveHoliday[] | null
): Celebration[] {
  const list: Celebration[] = [];

  if (today.day === 1) {
    list.push({
      id: "new-month",
      emoji: "🎉",
      title: "Hurray! Happy New Month!",
      body: `Welcome to ${today.monthName} ${today.year}, ${firstName}! New month, new goals — let's make it our best one yet.`,
    });
  }

  if (liveHolidays) {
    for (const h of liveHolidays) {
      if (h.date !== today.ymd) continue;
      const copy = HOLIDAY_COPY[h.name] ?? {
        emoji: "🎉",
        title: `Happy ${h.name}!`,
        body: `Happy ${h.name} from the whole team. Enjoy the day!`,
      };
      list.push({ id: `holiday-${h.date}-${h.name}`, ...copy });
    }
  } else {
    const mmdd = `${String(today.month).padStart(2, "0")}-${String(today.day).padStart(2, "0")}`;
    const fallback = FALLBACK_HOLIDAYS[mmdd];
    if (fallback) list.push({ id: `holiday-${today.ymd}-fallback`, ...fallback });
  }

  if (today.isMonday) {
    list.push({
      id: "new-week",
      emoji: "🚀",
      title: "Happy New Week!",
      body: `Fresh week, ${firstName}! Record your messages, open your accounts, and finish strong by Sunday.`,
    });
  }

  return list;
}

function storageKey(id: string) {
  return `ut_popup_${id}`;
}

export function popupShownToday(id: string, today: LagosToday): boolean {
  try {
    return localStorage.getItem(storageKey(id)) === today.ymd;
  } catch {
    return false;
  }
}

export function markPopupShownToday(id: string, today: LagosToday) {
  try {
    localStorage.setItem(storageKey(id), today.ymd);
  } catch {
    // ignore
  }
}
