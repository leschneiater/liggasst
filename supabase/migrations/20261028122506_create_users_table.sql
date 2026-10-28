/*
# Create users table (application profiles)

1. New Tables
- `public.users` — application-level profile table linked to auth.users.
  - `id` uuid PRIMARY KEY, references auth.users(id) ON DELETE CASCADE.
  - `email` text, unique, not null.
  - `name` text, nullable — display name or company name.
  - `type` text, not null, default 'professional' — values: 'professional', 'company', 'admin'.
  - `created_at` timestamptz, default now().
  - `updated_at` timestamptz, default now().
2. Security
- Enable RLS on `users`.
- Grant SELECT, INSERT, UPDATE to `authenticated`.
- Policies: users can read/update their own row; users can insert their own row.
3. Notes
- This table is the missing profile store that SupabaseAuthContext.loadUserProfile queries.
- Email confirmation is disabled in Supabase Auth settings, so signUp + signIn flow works end-to-end.
*/

CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  name text,
  type text NOT NULL DEFAULT 'professional' CHECK (type IN ('professional', 'company', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;

DROP POLICY IF EXISTS "select_own_profile" ON public.users;
CREATE POLICY "select_own_profile"
ON public.users FOR SELECT
TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON public.users;
CREATE POLICY "insert_own_profile"
ON public.users FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON public.users;
CREATE POLICY "update_own_profile"
ON public.users FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
