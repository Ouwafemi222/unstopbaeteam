export const INCENTIVE_SLOTS = [
  { slot: "office_prospects", label: "Most prospects in the office", source: "auto", unit: "prospects" },
  { slot: "top_earner", label: "Top earner", source: "auto", unit: "$" },
  { slot: "most_improved", label: "Most well improved", source: "manual", unit: "points" },
  { slot: "well_dressed", label: "Most well dressed", source: "manual", unit: "points" },
  { slot: "top_accounts", label: "Top accounts created in a month", source: "auto", unit: "accounts" },
  { slot: "top_messages", label: "Top messages received in a month", source: "auto", unit: "messages" },
  { slot: "five_stars", label: "Most members who received 5 stars", source: "auto", unit: "stars" },
] as const;

export type IncentiveSlot = (typeof INCENTIVE_SLOTS)[number]["slot"];
export type IncentiveSource = (typeof INCENTIVE_SLOTS)[number]["source"];

export const PICK_REASONS = [
  "Well behaved",
  "Learned",
  "Knowledge",
  "Book reading",
  "Daily activities",
  "Consistency",
  "Disciplined",
  "Does not complain",
  "Complies",
  "Treats the team well",
  "Works with the team",
] as const;

export type PickPlace = 1 | 2 | 3;

export function incentiveSlotMeta(slot: string) {
  return INCENTIVE_SLOTS.find((item) => item.slot === slot) ?? null;
}

export function placeScore(place: PickPlace) {
  if (place === 1) return 3;
  if (place === 2) return 2;
  return 1;
}

export function placeLabel(place: PickPlace) {
  if (place === 1) return "1st";
  if (place === 2) return "2nd";
  return "3rd";
}

export function placeFromScore(score: number): PickPlace {
  if (score >= 3) return 1;
  if (score === 2) return 2;
  return 3;
}

export function reasonsFromNote(note: string) {
  const parts = note
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
  const known = parts.filter((part) => (PICK_REASONS as readonly string[]).includes(part));
  return known.length > 0 ? known : parts;
}
