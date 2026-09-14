const STORAGE_KEY = "ut_order_gifts_v1";
export const ORDER_GIFT_REPEAT_MS = 30 * 60 * 1000; // 30 minutes
export const ORDER_GIFT_MAX_SHOWS = 2;
/** Still deliver missed gifts for orders up to this age */
export const ORDER_GIFT_ELIGIBLE_MS = ORDER_GIFT_REPEAT_MS * 2 + 5 * 60 * 1000;

export type OrderGiftJob = {
  id: string;
  actorName: string;
  createdAt: string;
  shownCount: number;
  nextShowAt: number;
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function loadOrderGiftJobs(): OrderGiftJob[] {
  if (!canUseStorage()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OrderGiftJob[];
    if (!Array.isArray(parsed)) return [];
    const now = Date.now();
    return parsed.filter((j) => {
      if (!j?.id || !j.actorName) return false;
      const created = new Date(j.createdAt).getTime();
      if (!Number.isFinite(created)) return false;
      if (now - created > ORDER_GIFT_ELIGIBLE_MS) return false;
      return j.shownCount < ORDER_GIFT_MAX_SHOWS;
    });
  } catch {
    return [];
  }
}

export function saveOrderGiftJobs(jobs: OrderGiftJob[]) {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
  } catch {
    /* ignore quota */
  }
}

/** Queue an order win so every teammate sees the gift up to twice (now + 30m later). */
export function enqueueOrderGift(input: {
  id: string;
  actorName: string;
  createdAt: string;
}): OrderGiftJob[] {
  const jobs = loadOrderGiftJobs();
  const existing = jobs.find((j) => j.id === input.id);
  if (existing) return jobs;

  const created = new Date(input.createdAt).getTime();
  const now = Date.now();
  if (!Number.isFinite(created) || now - created > ORDER_GIFT_ELIGIBLE_MS) {
    return jobs;
  }

  const next: OrderGiftJob = {
    id: input.id,
    actorName: input.actorName,
    createdAt: input.createdAt,
    shownCount: 0,
    nextShowAt: now,
  };
  const updated = [next, ...jobs].slice(0, 20);
  saveOrderGiftJobs(updated);
  return updated;
}

export function markOrderGiftShown(id: string): OrderGiftJob[] {
  const now = Date.now();
  const updated = loadOrderGiftJobs()
    .map((j) => {
      if (j.id !== id) return j;
      const shownCount = j.shownCount + 1;
      if (shownCount >= ORDER_GIFT_MAX_SHOWS) return null;
      return {
        ...j,
        shownCount,
        nextShowAt: now + ORDER_GIFT_REPEAT_MS,
      };
    })
    .filter((j): j is OrderGiftJob => Boolean(j));
  saveOrderGiftJobs(updated);
  return updated;
}

export function peekDueOrderGift(jobs = loadOrderGiftJobs()): OrderGiftJob | null {
  const now = Date.now();
  const due = jobs
    .filter((j) => j.shownCount < ORDER_GIFT_MAX_SHOWS && j.nextShowAt <= now)
    .sort((a, b) => a.nextShowAt - b.nextShowAt);
  return due[0] ?? null;
}

export function msUntilNextOrderGift(jobs = loadOrderGiftJobs()): number | null {
  const now = Date.now();
  const upcoming = jobs
    .filter((j) => j.shownCount < ORDER_GIFT_MAX_SHOWS && j.nextShowAt > now)
    .map((j) => j.nextShowAt - now)
    .sort((a, b) => a - b);
  return upcoming[0] ?? null;
}
