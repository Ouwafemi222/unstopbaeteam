export type EvaluationTopicKind = "count" | "amount" | "text";

/** Which recorded table a number is checked against. */
export type EvaluationTallyKey =
  | "accounts"
  | "prospects"
  | "messages"
  | "orders"
  | "order_amount";

export type EvaluationTopic = {
  id: string;
  title: string;
  prompt: string;
  kind: EvaluationTopicKind;
  tallyKey: EvaluationTallyKey | null;
};

/**
 * Questions copied onto each sheet when the super admin presses Send.
 * Add another object here when the whole team should be asked it every week.
 */
export const WEEKLY_EVALUATION_TOPICS: EvaluationTopic[] = [
  {
    id: "accounts",
    title: "Accounts opened",
    prompt: "How many Fiverr accounts did you open this week?",
    kind: "count",
    tallyKey: "accounts",
  },
  {
    id: "prospects",
    title: "Prospects",
    prompt: "How many prospects did you have as an individual?",
    kind: "count",
    tallyKey: "prospects",
  },
  {
    id: "messages",
    title: "Messages received on Fiverr",
    prompt: "How many messages did you receive on Fiverr this week?",
    kind: "count",
    tallyKey: "messages",
  },
  {
    id: "orders",
    title: "Orders received on Fiverr",
    prompt: "How many orders did you receive on Fiverr?",
    kind: "count",
    tallyKey: "orders",
  },
  {
    id: "order_amount",
    title: "Amount of orders received",
    prompt: "What was the total amount of those orders? Include the currency.",
    kind: "amount",
    tallyKey: "order_amount",
  },
  {
    id: "activities",
    title: "Other work you got done",
    prompt:
      "If you had no new messages or accounts, write the other work you did this week. Gigs, follow-ups, learning, office work — put it here.",
    kind: "text",
    tallyKey: null,
  },
];
