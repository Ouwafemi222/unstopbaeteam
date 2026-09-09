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

## Test

1. `/join` → confirm signup email  
2. Forgot password → reset email  
3. Optionally enable Magic Link provider for sign-in emails  
4. Toggle a Security notification and change password to test  
5. Manually hit cron (with secret if set):
   - `GET /api/cron/weekly-evaluation-reminder`
   - `GET /api/cron/debt-reminder`
