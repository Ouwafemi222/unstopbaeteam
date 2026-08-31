# UNSTOPPABLE TEAM

Internal team management platform for Fiverr accounts, messages, and performance tracking.

## Tech Stack

- **Frontend:** Next.js 16, TypeScript, Tailwind CSS, shadcn/ui patterns, Lucide icons, Recharts
- **Backend:** Supabase (PostgreSQL, Auth, Storage, RLS)
- **Auth:** Supabase Auth with RBAC

## Getting Started

### 1. Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials:

```bash
cp .env.local.example .env.local
```

Get your keys from [Supabase Dashboard](https://supabase.com/dashboard/project/ugunmlioollkyshmeelm/settings/api).

### 2. Install Dependencies

```bash
npm install
```

### 3. Create users from the dashboard (Super Admin)

Go to **Users & Roles** → **Create New User**. Enter email, name, password, and role.

This requires the **service role key** in `.env.local` (server-only, never share publicly):

1. Open [Supabase → Settings → API](https://supabase.com/dashboard/project/ugunmlioollkyshmeelm/settings/api)
2. Copy the **service_role** key (secret)
3. Add to `.env.local`:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```
4. Restart the dev server

Alternatively, use the setup script for your own admin account only:

```bash
npx tsx scripts/setup-admin.ts
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login, forgot/reset password
│   ├── (dashboard)/     # Protected app pages
│   └── api/             # API routes (reports export)
├── components/
│   ├── ui/              # Reusable UI components
│   ├── layout/          # Sidebar, header, search
│   ├── dashboard/       # Dashboard widgets
│   ├── accounts/        # Account components
│   ├── members/         # Team member components
│   └── shared/          # Status badges, etc.
├── lib/
│   ├── supabase/        # Supabase clients
│   ├── auth/            # Permissions helpers
│   ├── services/        # Activity logging
│   └── utils/           # Date helpers, etc.
└── types/               # TypeScript types
```

## Features (Phase 1)

- Authentication (login, forgot/reset password)
- Role-based access control (Super Admin, Account Manager, Viewer, etc.)
- Dashboard with real-time statistics and charts
- Team Members management with detail profiles
- Fiverr Accounts CRUD with duplicate detection
- Message tracking with quick entry mode
- Services management
- Global search across all entities
- Monthly performance tracking
- Reports with CSV export
- Activity audit log
- Screenshot import placeholder (ready for OCR integration)
- Responsive design (desktop sidebar, mobile drawer)

## Database

Schema is managed via Supabase migrations. Tables include:
- profiles, roles, permissions, role_permissions, user_roles
- team_members, fiverr_accounts, account_services
- messages, services, countries
- member_notes, account_notes, message_notes
- attachments, activity_logs, system_settings

## Security

- Row Level Security on all tables
- Permission checks at database level
- No storage of passwords, OTP codes, or 2FA secrets
- Secure attachment storage with signed URLs
- Protected routes via middleware

## Repository

GitHub: https://github.com/Ouwafemi222/unstopbaeteam

Supabase: https://supabase.com/dashboard/project/ugunmlioollkyshmeelm
