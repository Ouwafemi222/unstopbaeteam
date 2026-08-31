/** Supabase built-in SMTP: ~2 auth emails/hour project-wide. Use custom SMTP for production. */
export function isEmailRateLimitError(message: string, code?: string): boolean {
  const msg = message.toLowerCase();
  const c = (code ?? "").toLowerCase();
  return (
    c === "over_email_send_rate_limit" ||
    msg.includes("email rate limit") ||
    msg.includes("rate limit exceeded") ||
    msg.includes("too many requests")
  );
}

export function emailRateLimitMessage(): string {
  return (
    "Email limit reached — Supabase only allows about 2 confirmation emails per hour on the free mail service. " +
    "Wait 60 minutes and try again, or ask Mr Femi to confirm your account from the admin panel. " +
    "For the whole team to register smoothly, set up custom SMTP in Supabase (Authentication → SMTP)."
  );
}

export function formatAuthError(message: string, code?: string): string {
  if (isEmailRateLimitError(message, code)) return emailRateLimitMessage();
  return message;
}
