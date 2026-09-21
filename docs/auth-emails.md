# Custom auth + reminder emails

UNSTOPPABLE TEAM sends branded emails through:

1. **Auth Hook Edge Function** `send-email` (signup, sign-in/magic link, reset password, invite, email change, reauthentication, and security notifications)
2. **Vercel crons** for operational reminders (missing weekly activity, unpaid debt/fines)

## Auth emails (screenshot templates)

Handled by: `https://ugunmlioollkyshmeelm.supabase.co/functions/v1/send-email`

| Dashboard label | Hook type |
| --- | --- |
| Confirm sign up | `signup` |
| Invite user | `invite` |
| Magic link or OTP (sign in) | `magiclink` |
| Change email address | `email_change` |
| Reset password | `recovery` |
| Reauthentication | `reauthentication` |
| Password changed | `password_changed_notification` |
| Email address changed | `email_changed_notification` |
| Phone / MFA / sign-in method linked/removed | matching `*_notification` types |

### Enable security notification emails

In Supabase → **Authentication → Emails**:

1. Turn **ON** the Security toggles you want (Password changed, Email address changed, etc.)
2. Click **Save changes**

Those events then go through the same Send Email hook and Resend templates.

Auth Templates under Authentication are **not used** while the Send Email hook is enabled — the Edge Function owns the HTML.

## Reminder emails (not in Auth screenshot)

| Reminder | When | Endpoint |
| --- | --- | --- |
| Missing weekly activity / check dashboard | Sundays ~08:00 Lagos | `/api/cron/weekly-evaluation-reminder` |
| Unpaid debt / fine | Mondays ~09:00 Lagos | `/api/cron/debt-reminder` |

Also creates in-app notifications.

## Secrets

### Supabase Edge Function secrets

- `RESEND_API_KEY`
- `SEND_EMAIL_HOOK_SECRET` (`v1,whsec_...`)
- `EMAIL_FROM`
- `APP_URL`
- `SITE_NAME`

### Vercel (for reminder crons)

Add the same mail secrets to the Next.js app:

- `RESEND_API_KEY`
- `EMAIL_FROM`
- `APP_URL` or `NEXT_PUBLIC_APP_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (already needed for admin crons)
- `CRON_SECRET` (recommended)

Without `RESEND_API_KEY` on Vercel, in-app reminders still work but emails will not send from crons.

## Why registration showed “Unexpected status code returned from hook: 500”

Signup used to call Supabase `/auth/v1/signup`, which triggers the **Send Email Auth Hook**
(`send-email` Edge Function → Resend).

If Resend is still in **test mode** (no verified domain), it only allows sending to the Resend
account owner (`oluwafemipeter14@gmail.com`). Any other member email is rejected with HTTP 403.
The hook then returns **500**, and Auth fails the whole signup with:

> Unexpected status code returned from hook: 500

### Fix in the app

`/api/join/register` now creates users with the **Admin API** (no Auth Hook on signup), sends the
confirmation email via Resend from the Next.js route, and if Resend is still domain-locked it
**auto-activates** the account so the member can sign in.

### Permanent mail fix (do this)

1. Go to [resend.com/domains](https://resend.com/domains) and verify your domain (DNS records).
2. Set Edge Function + Vercel secret `EMAIL_FROM` to something like `UNSTOPPABLE TEAM <noreply@yourdomain.com>`.
3. Redeploy / refresh the `send-email` function secrets.

Until then, password-reset / magic-link emails that still go through the Auth Hook may fail for
non-owner addresses.
