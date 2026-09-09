# Custom auth emails (Supabase Edge Function + Resend)

UNSTOPPABLE TEAM sends **signup** and **password reset** emails through a Supabase **Send Email Auth Hook** Edge Function (`send-email`), using branded HTML and [Resend](https://resend.com).

## Architecture

1. User registers (`/join`) or requests password reset (`/forgot-password`).
2. Supabase Auth triggers the **Send Email** hook instead of its built-in mailer.
3. Edge Function `send-email` verifies the webhook, picks a template, and sends via Resend.
4. Confirm / reset links still use Supabase verify URLs and your existing `/auth/callback` + `/reset-password` pages.

**Function URL**

```text
https://ugunmlioollkyshmeelm.supabase.co/functions/v1/send-email
```

Source: [`supabase/functions/send-email/`](../supabase/functions/send-email/)

## One-time setup

### 1. Create a Resend account

1. Sign up at [https://resend.com](https://resend.com).
2. Create an API key (**API Keys** → **Create API Key**).
3. For production, add and verify your domain (**Domains**).
4. Until a domain is verified, you can test with:
   - From: `UNSTOPPABLE TEAM <onboarding@resend.dev>`
   - To: only the email on your Resend account

### 2. Set Edge Function secrets

In Supabase Dashboard → **Project Settings** → **Edge Functions** → **Secrets**, add:

| Name | Example value |
| --- | --- |
| `RESEND_API_KEY` | `re_...` from Resend |
| `SEND_EMAIL_HOOK_SECRET` | `v1,whsec_...` from Auth Hooks (step 3) |
| `EMAIL_FROM` | `UNSTOPPABLE TEAM <onboarding@resend.dev>` or `UNSTOPPABLE TEAM <noreply@yourdomain.com>` |
| `APP_URL` | `https://unsttopableteam.vercel.app` |
| `SITE_NAME` | `UNSTOPPABLE TEAM` |

`SUPABASE_URL` is usually injected automatically for Edge Functions.

### 3. Enable the Send Email Auth Hook

1. Open [Authentication → Hooks](https://supabase.com/dashboard/project/ugunmlioollkyshmeelm/auth/hooks).
2. Enable **Send Email**.
3. Choose **HTTPS**.
4. URI:
   ```text
   https://ugunmlioollkyshmeelm.supabase.co/functions/v1/send-email
   ```
5. Click **Generate secret**, copy the full value (`v1,whsec_...`).
6. Paste that exact value into the Edge secret `SEND_EMAIL_HOOK_SECRET` (step 2).
7. Save / enable the hook.

### 4. Keep Auth email provider enabled

Authentication → **Providers** → **Email** must stay **enabled**.  
With the hook on, SMTP is not used for those emails — the Edge Function sends them.

### 5. Test

1. Register a new member at `/join` → branded **Confirm your email** message.
2. Use **Forgot password** → branded **Reset your password** message.
3. Open Edge Function logs if delivery fails:
   [Functions → send-email → Logs](https://supabase.com/dashboard/project/ugunmlioollkyshmeelm/functions)

## Important

- While the hook is **enabled**, Auth does **not** fall back to default Supabase emails. If secrets are missing or Resend fails, users get **no** email.
- Do **not** enable JWT verification on this function — Auth signs the webhook; `verify_jwt` is off on purpose.
- After rotating the hook secret in the Dashboard, update `SEND_EMAIL_HOOK_SECRET` to match.

## Redeploy

From the repo (with Supabase CLI linked), or re-deploy via Dashboard / MCP:

```bash
supabase functions deploy send-email --no-verify-jwt --project-ref ugunmlioollkyshmeelm
```
