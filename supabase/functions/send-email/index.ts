import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
import { Resend } from "npm:resend@4.0.1";

type EmailActionType = string;

interface HookUser {
  email: string;
  new_email?: string;
  user_metadata?: {
    full_name?: string;
    preferred_name?: string;
    [key: string]: unknown;
  };
}

interface EmailData {
  token: string;
  token_hash: string;
  redirect_to: string;
  email_action_type: EmailActionType;
  site_url: string;
  token_new: string;
  token_hash_new: string;
  old_email?: string;
  old_phone?: string;
  provider?: string;
  factor_type?: string;
}

const PROJECT_URL = Deno.env.get("SUPABASE_URL") ?? "https://ugunmlioollkyshmeelm.supabase.co";
const SITE_NAME = Deno.env.get("SITE_NAME") ?? "UNSTOPPABLE TEAM";
const APP_URL = Deno.env.get("APP_URL") ?? "https://unsttopableteam.vercel.app";
const EMAIL_FROM =
  Deno.env.get("EMAIL_FROM") ?? `${SITE_NAME} <onboarding@resend.dev>`;

const ACTION_TYPES = new Set([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
  "reauthentication",
]);

const NOTIFY_TYPES = new Set([
  "password_changed_notification",
  "email_changed_notification",
  "phone_changed_notification",
  "identity_linked_notification",
  "identity_unlinked_notification",
  "mfa_factor_enrolled_notification",
  "mfa_factor_unenrolled_notification",
]);

function buildVerifyUrl(tokenHash: string, type: string, redirectTo: string): string {
  const url = new URL(`${PROJECT_URL}/auth/v1/verify`);
  url.searchParams.set("token", tokenHash);
  url.searchParams.set("type", type);
  if (redirectTo) url.searchParams.set("redirect_to", redirectTo);
  return url.toString();
}

function greetingName(user: HookUser): string {
  const meta = user.user_metadata ?? {};
  return (
    (typeof meta.preferred_name === "string" && meta.preferred_name) ||
    (typeof meta.full_name === "string" && meta.full_name.split(" ")[0]) ||
    user.email.split("@")[0] ||
    "there"
  );
}

function subjectFor(type: EmailActionType): string {
  switch (type) {
    case "signup":
      return `Confirm your email — ${SITE_NAME}`;
    case "recovery":
      return `Reset your password — ${SITE_NAME}`;
    case "magiclink":
      return `Your sign-in link — ${SITE_NAME}`;
    case "invite":
      return `You're invited to ${SITE_NAME}`;
    case "email_change":
      return `Confirm your new email — ${SITE_NAME}`;
    case "reauthentication":
      return `Your verification code — ${SITE_NAME}`;
    case "password_changed_notification":
      return `Your password was changed — ${SITE_NAME}`;
    case "email_changed_notification":
      return `Your email address was changed — ${SITE_NAME}`;
    case "phone_changed_notification":
      return `Your phone number was changed — ${SITE_NAME}`;
    case "identity_linked_notification":
      return `A sign-in method was linked — ${SITE_NAME}`;
    case "identity_unlinked_notification":
      return `A sign-in method was removed — ${SITE_NAME}`;
    case "mfa_factor_enrolled_notification":
      return `MFA method added — ${SITE_NAME}`;
    case "mfa_factor_unenrolled_notification":
      return `MFA method removed — ${SITE_NAME}`;
    default:
      return `${SITE_NAME} account notification`;
  }
}

function headlineFor(type: EmailActionType): string {
  switch (type) {
    case "signup":
      return "Confirm your email";
    case "recovery":
      return "Reset your password";
    case "magiclink":
      return "Sign in to your account";
    case "invite":
      return "You're invited";
    case "email_change":
      return "Confirm your new email";
    case "reauthentication":
      return "Verification code";
    case "password_changed_notification":
      return "Password changed";
    case "email_changed_notification":
      return "Email address changed";
    case "phone_changed_notification":
      return "Phone number changed";
    case "identity_linked_notification":
      return "Sign-in method linked";
    case "identity_unlinked_notification":
      return "Sign-in method removed";
    case "mfa_factor_enrolled_notification":
      return "MFA method added";
    case "mfa_factor_unenrolled_notification":
      return "MFA method removed";
    default:
      return "Account update";
  }
}

function bodyCopyFor(type: EmailActionType, emailData: EmailData, user: HookUser): string {
  switch (type) {
    case "signup":
      return "Welcome to UNSTOPPABLE TEAM. Confirm your email to activate your account and open your dashboard.";
    case "recovery":
      return "We received a request to reset your password. Click the button below to choose a new one. If you did not ask for this, you can ignore this email.";
    case "magiclink":
      return "Use the button below to sign in securely. This link expires soon.";
    case "invite":
      return "You have been invited to join UNSTOPPABLE TEAM. Click below to accept and finish setup.";
    case "email_change":
      return "Confirm this email address to finish updating your account.";
    case "reauthentication":
      return "Enter this verification code to continue with a sensitive account action.";
    case "password_changed_notification":
      return "Your password was just changed. If this was you, no action is needed. If not, reset your password immediately and contact admin.";
    case "email_changed_notification":
      return `Your account email was changed${emailData.old_email ? ` from ${emailData.old_email}` : ""}${user.new_email || user.email ? ` to ${user.new_email || user.email}` : ""}. If this was not you, contact admin right away.`;
    case "phone_changed_notification":
      return "Your phone number on file was changed. If this was not you, contact admin right away.";
    case "identity_linked_notification":
      return `A new sign-in method${emailData.provider ? ` (${emailData.provider})` : ""} was linked to your account.`;
    case "identity_unlinked_notification":
      return `A sign-in method${emailData.provider ? ` (${emailData.provider})` : ""} was removed from your account.`;
    case "mfa_factor_enrolled_notification":
      return `An MFA method${emailData.factor_type ? ` (${emailData.factor_type})` : ""} was added to your account.`;
    case "mfa_factor_unenrolled_notification":
      return `An MFA method${emailData.factor_type ? ` (${emailData.factor_type})` : ""} was removed from your account.`;
    default:
      return "Please review this account update from UNSTOPPABLE TEAM.";
  }
}

function ctaLabelFor(type: EmailActionType): string {
  switch (type) {
    case "signup":
      return "Confirm email";
    case "recovery":
      return "Reset password";
    case "magiclink":
      return "Sign in";
    case "invite":
      return "Accept invite";
    case "email_change":
      return "Confirm new email";
    default:
      return "Open dashboard";
  }
}

function isActionEmail(type: EmailActionType): boolean {
  return ACTION_TYPES.has(type);
}

function isNotificationEmail(type: EmailActionType): boolean {
  return NOTIFY_TYPES.has(type);
}

function renderEmailHtml(opts: {
  name: string;
  type: EmailActionType;
  actionUrl: string | null;
  token: string;
  body: string;
  headline: string;
}): string {
  const { name, type, actionUrl, token, body, headline } = opts;
  const cta = ctaLabelFor(type);
  const showCode = type === "reauthentication" || (type === "signup" && !!token);
  const showButton = !!actionUrl && type !== "reauthentication";
  const dashboardUrl = APP_URL.replace(/\/$/, "") + "/dashboard";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(headline)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td style="background:linear-gradient(135deg,#16a34a,#15803d 55%,#f59e0b);padding:28px 28px 24px;">
              <p style="margin:0;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:rgba(255,255,255,0.85);font-weight:700;">UNSTOPPABLE</p>
              <p style="margin:4px 0 0;font-size:22px;font-weight:800;color:#ffffff;">TEAM</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <p style="margin:0 0 8px;font-size:14px;color:#6b7280;">Hi ${escapeHtml(name)},</p>
              <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#111827;">${escapeHtml(headline)}</h1>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#374151;">${escapeHtml(body)}</p>
              ${
                showButton && actionUrl
                  ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 24px;">
                <tr>
                  <td style="border-radius:10px;background:#16a34a;">
                    <a href="${escapeAttr(actionUrl)}" style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">${escapeHtml(cta)}</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 16px;font-size:12px;line-height:1.5;color:#9ca3af;">If the button does not work, copy and paste this link into your browser:<br /><a href="${escapeAttr(actionUrl)}" style="color:#15803d;word-break:break-all;">${escapeHtml(actionUrl)}</a></p>`
                  : ""
              }
              ${
                isNotificationEmail(type)
                  ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 16px;">
                <tr>
                  <td style="border-radius:10px;background:#16a34a;">
                    <a href="${escapeAttr(dashboardUrl)}" style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">Check your dashboard</a>
                  </td>
                </tr>
              </table>`
                  : ""
              }
              ${
                showCode && token
                  ? `<div style="margin:0 0 8px;padding:14px 16px;border-radius:12px;background:#f0fdf4;border:1px solid #bbf7d0;text-align:center;">
                <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#15803d;font-weight:700;">Your code</p>
                <p style="margin:0;font-size:28px;letter-spacing:0.2em;font-weight:800;color:#14532d;">${escapeHtml(token)}</p>
              </div>`
                  : ""
              }
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 24px;border-top:1px solid #f3f4f6;">
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">
                Sent by ${escapeHtml(SITE_NAME)}. Visit
                <a href="${escapeAttr(APP_URL)}" style="color:#15803d;">${escapeHtml(APP_URL)}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value).replaceAll("`", "&#96;");
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("not allowed", { status: 400 });
  }

  const resendKey = Deno.env.get("RESEND_API_KEY");
  const hookSecretRaw = Deno.env.get("SEND_EMAIL_HOOK_SECRET");

  if (!resendKey) {
    return jsonError(500, "RESEND_API_KEY is not configured");
  }
  if (!hookSecretRaw) {
    return jsonError(500, "SEND_EMAIL_HOOK_SECRET is not configured");
  }

  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);
  const hookSecret = hookSecretRaw.replace("v1,whsec_", "");

  try {
    const wh = new Webhook(hookSecret);
    const { user, email_data } = wh.verify(payload, headers) as {
      user: HookUser;
      email_data: EmailData;
    };

    const type = email_data.email_action_type;
    const actionUrl = isActionEmail(type) && email_data.token_hash
      ? buildVerifyUrl(email_data.token_hash, type, email_data.redirect_to || APP_URL)
      : null;

    const html = renderEmailHtml({
      name: greetingName(user),
      type,
      actionUrl,
      token: email_data.token,
      body: bodyCopyFor(type, email_data, user),
      headline: headlineFor(type),
    });

    const resend = new Resend(resendKey);
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: [user.email],
      subject: subjectFor(type),
      html,
    });

    if (error) {
      console.error("Resend error", error);
      return jsonError(500, error.message ?? "Failed to send email");
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook verification failed";
    console.error("send-email hook error", message);
    return new Response(
      JSON.stringify({
        error: {
          http_code: 401,
          message,
        },
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return new Response(JSON.stringify({}), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

function jsonError(status: number, message: string) {
  return new Response(
    JSON.stringify({
      error: {
        http_code: status,
        message,
      },
    }),
    {
      status,
      headers: { "Content-Type": "application/json" },
    }
  );
}
