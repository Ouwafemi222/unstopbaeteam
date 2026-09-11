export type LiveEventKind = "message" | "account";

/**
 * Fire-and-forget publish for the dashboard live pulse.
 * Safe to call from client components after a successful create.
 */
export function publishLiveEvent(payload: {
  kind: LiveEventKind;
  actorName: string;
  summary: string;
  href?: string | null;
}) {
  void fetch("/api/live-events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {
    /* non-blocking */
  });
}
