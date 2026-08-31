import type { SupabaseClient, User } from "@supabase/supabase-js";
import { emailRateLimitMessage, formatAuthError, isEmailRateLimitError } from "@/lib/auth/email-errors";

export async function findAuthUserByEmail(
  admin: SupabaseClient,
  email: string
): Promise<User | null> {
  const normalized = email.trim().toLowerCase();
  let page = 1;

  while (page <= 5) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error || !data.users.length) break;

    const found = data.users.find((u) => u.email?.toLowerCase() === normalized);
    if (found) return found;

    if (data.users.length < 100) break;
    page++;
  }

  return null;
}

export function parseAuthApiError(payload: {
  msg?: string;
  error_description?: string;
  message?: string;
  code?: string;
}): { message: string; code?: string } {
  const message = payload.msg ?? payload.error_description ?? payload.message ?? "Request failed";
  const code = payload.code;
  return { message: formatAuthError(message, code), code };
}

export { isEmailRateLimitError, emailRateLimitMessage, formatAuthError };
