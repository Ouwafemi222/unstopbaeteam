export type BlueprintStep = {
  id: string;
  title: string;
  detail: string;
  /** Optional external links (e.g. sign-in pages). */
  links?: { label: string; href: string }[];
};

export type BlueprintDay = {
  day: number;
  title: string;
  intro: string;
  steps: BlueprintStep[];
};

/** Training template — add more days here as you define them with the team. */
export const TEAM_BLUEPRINT_DAYS: BlueprintDay[] = [
  {
    day: 1,
    title: "Day 1 — Start here",
    intro:
      "Complete every item below before moving on to Fiverr work in the app. This matches the office onboarding flow tied to THE PRUDENCE.",
    steps: [
      {
        id: "social-discord",
        title: "Open Discord",
        detail: "Sign in or create your account. Keep notifications on for team updates.",
        links: [{ label: "Open Discord", href: "https://discord.com/login" }],
      },
      {
        id: "social-facebook",
        title: "Open Facebook",
        detail: "Use the account you will use for work-related pages or groups if your sponsor assigns them.",
        links: [{ label: "Open Facebook", href: "https://www.facebook.com/" }],
      },
      {
        id: "social-tiktok",
        title: "Open TikTok",
        detail: "Sign in and confirm you can access the app on your phone or desktop.",
        links: [{ label: "Open TikTok", href: "https://www.tiktok.com/login" }],
      },
      {
        id: "social-twitter",
        title: "Open Twitter / X",
        detail: "Sign in to X (Twitter) with the profile your team uses for outreach if applicable.",
        links: [{ label: "Open X", href: "https://x.com/i/flow/login" }],
      },
      {
        id: "social-instagram",
        title: "Open Instagram",
        detail: "Sign in and verify you can post or message if your role requires it.",
        links: [{ label: "Open Instagram", href: "https://www.instagram.com/accounts/login/" }],
      },
      {
        id: "pdf-training",
        title: "Receive your Digital Marketing class PDF",
        detail:
          "Collect the PDF training material from your Digital Marketing class (from your trainer or shared drive). Save it where you can find it daily — phone files, Google Drive, or printed copy.",
      },
      {
        id: "prudence-only",
        title: "Use only THE PRUDENCE package knowledge",
        detail:
          "For office accountability and training, follow the methods and materials from THE PRUDENCE — not random shortcuts from elsewhere. When in doubt, ask your sponsor or admin.",
      },
    ],
  },
];
