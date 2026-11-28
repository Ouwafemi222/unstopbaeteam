export const INCENTIVE_SLOTS = [
  { slot: "office_prospects", label: "Most prospects in the office", source: "auto", unit: "prospects" },
  { slot: "top_earner", label: "Top earner", source: "auto", unit: "$" },
  { slot: "well_behaved", label: "Most well behaved", source: "manual", unit: "points" },
  { slot: "most_improved", label: "Most improved", source: "manual", unit: "points" },
  { slot: "most_learned", label: "Most learned", source: "manual", unit: "points" },
  { slot: "well_dressed", label: "Most well dressed", source: "manual", unit: "points" },
  { slot: "top_accounts", label: "Top accounts created in a month", source: "auto", unit: "accounts" },
  { slot: "top_messages", label: "Top messages received in a month", source: "auto", unit: "messages" },
  { slot: "five_stars", label: "Most members who received 5 stars", source: "auto", unit: "stars" },
] as const;

export type IncentiveSlot = (typeof INCENTIVE_SLOTS)[number]["slot"];
export type IncentiveSource = (typeof INCENTIVE_SLOTS)[number]["source"];

const AREA_PROMPTS: Record<string, string> = {
  most_improved: "Which area did this person improve?",
  well_behaved: "Where did you see this?",
  most_learned: "What did this person learn?",
  well_dressed: "What stood out?",
};

export function incentiveSlotMeta(slot: string) {
  return INCENTIVE_SLOTS.find((item) => item.slot === slot) ?? null;
}

export function incentiveAreaPrompt(slot: string) {
  return AREA_PROMPTS[slot] ?? "What did you see?";
}
