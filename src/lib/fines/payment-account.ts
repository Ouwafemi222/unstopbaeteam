/** Team fine payment destination — shown on the hanging rug banner. */
export const FINE_PAYMENT_ACCOUNT = {
  bank: "KUDA BANK",
  accountName: "OLUWAFEMI OLAYINKA OGUNDELE",
  accountNumber: "2083743498",
} as const;

/** Daily rotating captions (Lagos calendar day picks one). First entry is the launch message. */
export const FINE_RUG_CAPTIONS = [
  "PAY YOUR FINE · STAY DISCIPLINED",
  "CLEAR YOUR FINE · KEEP THE STANDARD",
  "OWN YOUR FINE · PROTECT THE TEAM",
  "PAY UP TODAY · STAY ACCOUNTABLE",
  "DISCIPLINE FIRST · THEN THE ORDERS",
  "SETTLE YOUR FINE · MOVE CLEAN",
  "NO EXCUSES · PAY YOUR FINE",
] as const;

function lagosYmd(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Stable daily caption from Lagos date (index 0 = lead caption). */
export function fineRugCaptionForToday(): string {
  const day = lagosYmd();
  const dayOfMonth = Number(day.slice(-2));
  const index = (dayOfMonth - 1) % FINE_RUG_CAPTIONS.length;
  return FINE_RUG_CAPTIONS[index] ?? FINE_RUG_CAPTIONS[0];
}
