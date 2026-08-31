/**
 * Shared name normalization for forecast accounts + messages.
 */
const TITLE_MAP: Record<string, string> = { mr: "Mr", mrs: "Mrs", miss: "Miss", ms: "Ms" };

const NAME_ALIASES: Record<string, string> = {
  "Mr Sam": "Mr Samuel",
  "Mr Seyun": "Mr Segun",
  "Mr Jaxon": "Mr Jason",
};

export function normalizeMemberName(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, " ");
  const parts = trimmed.split(" ");

  if (parts.length === 1) {
    return normalizeMemberName(`Mr ${parts[0]}`);
  }

  const titleKey = parts[0].toLowerCase();
  parts[0] = TITLE_MAP[titleKey] ?? parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
  parts[1] = parts[1].charAt(0).toUpperCase() + parts[1].slice(1).toLowerCase();

  if (parts[1].toLowerCase() === "debby") {
    parts[1] = "Deborah";
  }

  const result = parts.join(" ");
  return NAME_ALIASES[result] ?? result;
}

export function toRegistrationKey(name: string): string {
  return normalizeMemberName(name).toLowerCase().replace(/[^a-z0-9]/g, "");
}
