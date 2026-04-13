# Finance Tracker

A personal finance dashboard built with Next.js, Supabase, Tailwind CSS, and Recharts.

## Stack

- Next.js 14 + TypeScript
- Supabase Auth + Postgres + RLS
- Tailwind CSS
- Recharts
- Vercel deployment

## Quick Setup

### 1. Install dependencies

```bash
cd "FINANCE TRACKER"
npm install
```

### 2. Create your Supabase project

1. Create a project at `https://supabase.com`.
2. Open `Settings -> API`.
3. Copy these values:
   - Project URL
   - Anon key
   - Service role key

### 3. Create the database

1. In Supabase, open `SQL Editor`.
2. Open [supabase/schema.sql](/c:/Users/Mike Fernando/Desktop/FINANCE TRACKER/supabase/schema.sql) from this project.
3. Paste the full file and run it.

That creates:

- `profiles`
- `assets`
- `savings`
- `emergency_funds`
- `expenses`
- triggers
- indexes
- grants
- row level security policies

### 4. Create your first admin user

1. In Supabase, go to `Authentication -> Users`.
2. Click `Add user`.
3. Create the account you want to use as owner/admin.
4. Open [supabase/seed.sql](/c:/Users/Mike Fernando/Desktop/FINANCE TRACKER/supabase/seed.sql).
5. Replace every `your@email.com` with your real email.
6. Run the file in `SQL Editor`.

This will:

- promote your account to `super_admin`
- optionally insert starter sample data so the dashboard is not empty

### 5. Add local environment variables

Create `.env.local` in the project root from [.env.local.example](/c:/Users/Mike Fernando/Desktop/FINANCE TRACKER/.env.local.example):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 6. Run locally

```bash
npm run dev
```

Then open `http://localhost:3000` and log in with your admin account.

## Vercel Deploy

### 1. Push the project to GitHub

Import that repo into Vercel.

### 2. Add Vercel environment variables

Add these exact keys in Vercel:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`

Set `NEXT_PUBLIC_APP_URL` to your production URL, for example:

```env
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### 3. Configure Supabase auth URLs

In Supabase, open `Authentication -> URL Configuration` and set:

- Site URL: `https://your-app.vercel.app`
- Redirect URL: `https://your-app.vercel.app/reset-password`

### 4. Deploy

Trigger the Vercel deployment after the environment variables are saved.

## Creating More Users

Only a `super_admin` can create users.

1. Log in as admin.
2. Open `User Management`.
3. Create the user with email, password, name, and `super_admin` access if needed.

## Project Structure

```text
FINANCE TRACKER/
|-- app/
|   |-- (auth)/
|   |-- (dashboard)/
|   |-- api/
|-- components/
|-- lib/
|-- supabase/
|   |-- schema.sql
|   |-- seed.sql
|-- types/
|-- middleware.ts
|-- .env.local.example
```

## Database Tables

- `profiles`: `super_admin`, name, email, active status
- `assets`: asset tracking
- `savings`: savings goals
- `emergency_funds`: emergency fund tracking
- `expenses`: expenses with category and payment method

## Notes

- Public sign-up is intentionally disabled.
- The service role key is server-only. Never expose it in client code.
- `supabase/schema.sql` is now safer to re-run during setup.
