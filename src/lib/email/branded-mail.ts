const SITE_NAME = process.env.SITE_NAME ?? "UNSTOPPABLE TEAM";
const APP_URL = (process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://unsttopableteam.vercel.app").replace(
  /\/$/,
  ""
);
const EMAIL_FROM =
  process.env.EMAIL_FROM ?? `${SITE_NAME} <onboarding@resend.dev>`;

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

export function renderBrandedReminderHtml(opts: {
  name: string;
  headline: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
}): string {
  const { name, headline, body, ctaLabel, ctaUrl } = opts;
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
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 16px;">
                <tr>
                  <td style="border-radius:10px;background:#16a34a;">
                    <a href="${escapeAttr(ctaUrl)}" style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">${escapeHtml(ctaLabel)}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 24px;border-top:1px solid #f3f4f6;">
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">
                Sent by ${escapeHtml(SITE_NAME)}.
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

export async function sendBrandedEmail(opts: {
  to: string;
  subject: string;
  name: string;
  headline: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY not configured on Vercel" };
  }

  const html = renderBrandedReminderHtml({
    name: opts.name,
    headline: opts.headline,
    body: opts.body,
    ctaLabel: opts.ctaLabel,
    ctaUrl: opts.ctaUrl,
  });

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [opts.to],
      subject: opts.subject,
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { ok: false, error: text || `Resend HTTP ${res.status}` };
  }

  return { ok: true };
}

export { APP_URL, SITE_NAME };
