const TZ = "Africa/Lagos";

/** Whole Lagos calendar days from `iso` until `now`. */
export function lagosCalendarDaysAgo(iso: string, now = new Date()): number {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return 0;
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const start = Date.parse(`${day.format(then)}T00:00:00Z`);
  const end = Date.parse(`${day.format(now)}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000);
}

/** today, yesterday, 4 days ago, 3 weeks ago, and so on. */
export function whenAccountWasAdded(iso: string, now = new Date()): string {
  const days = lagosCalendarDaysAgo(iso, now);
  if (!Number.isFinite(days) || days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) {
    const weeks = Math.max(1, Math.floor(days / 7));
    return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
  }
  if (days < 365) {
    const months = Math.max(1, Math.floor(days / 30));
    return months === 1 ? "1 month ago" : `${months} months ago`;
  }
  const years = Math.floor(days / 365);
  return years === 1 ? "1 year ago" : `${years} years ago`;
}

export function presentAccountAddedNotification<
  T extends { title: string; message: string; created_at: string },
>(notification: T, now = new Date()): T {
  const isAccountAlert =
    /^New account added\b/i.test(notification.title) ||
    /added Fiverr account @/i.test(notification.message);
  if (!isAccountAlert) return notification;

  const when = whenAccountWasAdded(notification.created_at, now);
  const base = notification.message.replace(/\s+on the website\b[\s\S]*$/i, "").trim();

  return {
    ...notification,
    title: `New account added ${when}`,
    message: `${base} on the website ${when}.`,
  };
}
