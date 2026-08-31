import type { Service } from "@/types/database";

/** Extra gig-name keywords per service slug (imported messages use gig_name, not service_id). */
const SERVICE_GIG_KEYWORDS: Record<string, string[]> = {
  "3d-modeling": [
    "3d model",
    "3d print",
    "unity",
    "mural",
    "stained glass",
    "floor illusion",
  ],
  "ai-development": [
    "comfyui",
    "poker bot",
    "poker analysis",
    "chatbot",
    "n8n",
    "rork",
    "rorket",
    "scam code",
    "tester",
    "whatsapp",
  ],
  automation: [
    "spreadsheet",
    "zoho",
    "bitrix",
    "obsidian",
    "scan code",
    "email tracking",
    "supervisor",
  ],
  "content-writing": ["resume", "writing", "copy"],
  "digital-marketing": [
    "marketing",
    "affiliate",
    "partnerstack",
    "partner stack",
    "copecart",
    "payhip",
    "whop",
    "nas.io",
    "nasio",
    "phone call",
    "twitch",
  ],
  "graphic-design": [
    "juice label",
    "photo collage",
    "backyard design",
    "fabris",
    "grillz",
    "label",
    "collage",
    "design",
  ],
  "mobile-app-development": ["apple wallet", "shopify", "mobile", "app"],
  "second-life": ["second", "wool", "accesscosta", "assetto corsa", "assetto"],
  "video-editing": ["music", "video", "twitch"],
  "website-development": [
    "grid website",
    "grillz website",
    "lms",
    "airbnb",
    "p.p.p",
    "website",
    "web",
  ],
};

function keywordsForService(service: Pick<Service, "name" | "slug">): string[] {
  const fromName = service.name
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);
  const extra = SERVICE_GIG_KEYWORDS[service.slug] ?? [];
  return [...new Set([...fromName, ...extra])];
}

export function messageMatchesService(
  message: { service_id?: string | null; gig_name?: string | null },
  service: Pick<Service, "id" | "name" | "slug">
): boolean {
  if (message.service_id && message.service_id === service.id) return true;

  const gig = message.gig_name?.trim().toLowerCase();
  if (!gig) return false;

  const keywords = keywordsForService(service);
  return keywords.some((kw) => gig.includes(kw));
}

export function countMessagesForService(
  messages: { service_id?: string | null; gig_name?: string | null }[],
  service: Pick<Service, "id" | "name" | "slug">
): number {
  return messages.filter((m) => messageMatchesService(m, service)).length;
}
