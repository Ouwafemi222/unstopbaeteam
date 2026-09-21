/** Supabase built-in SMTP: ~2 auth emails/hour project-wide. Use custom SMTP for production. */
export function isEmailRateLimitError(message: string, code?: unknown): boolean {
  const msg = String(message ?? "").toLowerCase();
  const c = String(code ?? "").toLowerCase();
  return (
    c === "over_email_send_rate_limit" ||
    msg.includes("email rate limit") ||
    msg.includes("rate limit exceeded") ||
    msg.includes("too many requests") ||
    msg.includes("over_email_send_rate_limit")
  );
}

export function emailRateLimitMessage(): string {
  return (
    "Email limit reached — Supabase only allows about 2 confirmation emails per hour on the free mail service. " +
    "Wait 60 minutes and try again, or ask Mr Femi to confirm your account from the admin panel. " +
    "For the whole team to register smoothly, set up custom SMTP in Supabase (Authentication → SMTP)."
  );
}

export function formatAuthError(message: string, code?: unknown): string {
  if (isEmailRateLimitError(message, code)) return emailRateLimitMessage();
  const msg = String(message ?? "");
  const lower = msg.toLowerCase();
  if (
    lower.includes("unexpected status code") ||
    lower.includes("returned from hook") ||
    (lower.includes("hook") && lower.includes("500"))
  ) {
    return (
      "Email delivery failed while creating your account (Resend is limited to the owner email until a domain is verified). " +
      "Please try again — registration has been updated to work without that hook. " +
      "If it still fails, ask Mr Femi to verify a domain at resend.com/domains."
    );
  }
  if (lower.includes("only send testing emails") || lower.includes("verify a domain")) {
    return (
      "Confirmation emails can only be sent after verifying a domain on Resend. " +
      "Ask Mr Femi to verify a domain at resend.com/domains and set EMAIL_FROM to an address on that domain."
    );
  }
  return msg;
}
