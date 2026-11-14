import type { SupabaseClient } from "@supabase/supabase-js";
import type { Service } from "@/types/database";

export const POKER_BOT_NAME = "Poker Bot";
export const POKER_BOT_SLUG = "poker-bot";

export function isPokerBotName(name: string) {
  return name.trim().toLowerCase() === POKER_BOT_NAME.toLowerCase();
}

export function hasPokerBot(services: { name: string; slug?: string }[]) {
  return services.some((service) => isPokerBotName(service.name) || service.slug === POKER_BOT_SLUG);
}

export function isServiceUuid(id: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/** Active services, with Poker Bot added to the catalog when it is missing. */
export async function loadActiveServices(supabase: SupabaseClient): Promise<Service[]> {
  const { data } = await supabase.from("services").select("*").eq("is_active", true).order("name");
  const list = (data ?? []) as Service[];
  if (hasPokerBot(list)) return list;

  try {
    const response = await fetch("/api/services/poker-bot");
    const body = (await response.json()) as { service?: Service | null };
    if (response.ok && body.service) {
      return [...list, body.service].sort((a, b) => a.name.localeCompare(b.name));
    }
  } catch {
    // The typed choice still works on the account form.
  }

  return list;
}
