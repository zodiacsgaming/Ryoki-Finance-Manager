-- ============================================================
-- FINANCE TRACKER - SUPABASE SCHEMA
-- Run this entire file in the Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Make re-runs safe while setting up or iterating
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
    DROP TRIGGER IF EXISTS set_updated_at_profiles ON public.profiles;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'assets') THEN
    DROP TRIGGER IF EXISTS set_updated_at_assets ON public.assets;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'savings') THEN
    DROP TRIGGER IF EXISTS set_updated_at_savings ON public.savings;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'emergency_funds') THEN
    DROP TRIGGER IF EXISTS set_updated_at_emergency_funds ON public.emergency_funds;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'expenses') THEN
    DROP TRIGGER IF EXISTS set_updated_at_expenses ON public.expenses;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'cash_on_hand') THEN
    DROP TRIGGER IF EXISTS set_updated_at_cash_on_hand ON public.cash_on_hand;
  END IF;
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
END $$;

-- ============================================================
-- PROFILES TABLE
-- Extends Supabase auth.users with admin flag and status
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  super_admin BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS super_admin BOOLEAN NOT NULL DEFAULT false;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'role'
  ) THEN
    UPDATE public.profiles
    SET super_admin = true
    WHERE role = 'super_admin';
  END IF;
END $$;

-- ============================================================
-- ASSETS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.assets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Cash', 'Investments', 'Property', 'Vehicle', 'Gadgets', 'Other')),
  value NUMERIC(15,2) NOT NULL DEFAULT 0,
  date_added DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- SAVINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.savings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  target_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  current_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- EMERGENCY FUNDS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.emergency_funds (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  target_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  current_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- EXPENSES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  category TEXT NOT NULL CHECK (category IN ('Food', 'Transportation', 'Bills', 'Shopping', 'Rent', 'Others', 'Savings', 'Cash on Hand', 'Emergency Fund')),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL DEFAULT 'Cash' CHECK (payment_method IN ('Cash', 'Credit Card', 'Debit Card', 'Bank Transfer', 'E-Wallet', 'Other')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CASH ON HAND TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cash_on_hand (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  type TEXT NOT NULL CHECK (type IN ('in', 'out')),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables
CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_assets
  BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_savings
  BEFORE UPDATE ON public.savings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_emergency_funds
  BEFORE UPDATE ON public.emergency_funds
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_expenses
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_cash_on_hand
  BEFORE UPDATE ON public.cash_on_hand
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGN UP
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, super_admin)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'super_admin')::boolean, false)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- ---- PROFILES POLICIES ----
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admin can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admin can delete profiles" ON public.profiles;

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Super admin can view all profiles
CREATE POLICY "Super admin can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND super_admin = true
    )
  );

-- Super admin can update all profiles
CREATE POLICY "Super admin can update all profiles"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND super_admin = true
    )
  );

-- Super admin can delete profiles
CREATE POLICY "Super admin can delete profiles"
  ON public.profiles FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND super_admin = true
    )
  );

-- ---- ASSETS POLICIES ----
DROP POLICY IF EXISTS "Users can manage own assets" ON public.assets;
DROP POLICY IF EXISTS "Super admin can view all assets" ON public.assets;

CREATE POLICY "Users can manage own assets"
  ON public.assets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Super admin can view all assets"
  ON public.assets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND super_admin = true
    )
  );

-- ---- SAVINGS POLICIES ----
DROP POLICY IF EXISTS "Users can manage own savings" ON public.savings;
DROP POLICY IF EXISTS "Super admin can view all savings" ON public.savings;

CREATE POLICY "Users can manage own savings"
  ON public.savings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Super admin can view all savings"
  ON public.savings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND super_admin = true
    )
  );

-- ---- EMERGENCY FUNDS POLICIES ----
DROP POLICY IF EXISTS "Users can manage own emergency funds" ON public.emergency_funds;
DROP POLICY IF EXISTS "Super admin can view all emergency funds" ON public.emergency_funds;

CREATE POLICY "Users can manage own emergency funds"
  ON public.emergency_funds FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Super admin can view all emergency funds"
  ON public.emergency_funds FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND super_admin = true
    )
  );

-- ---- EXPENSES POLICIES ----
DROP POLICY IF EXISTS "Users can manage own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Super admin can view all expenses" ON public.expenses;

CREATE POLICY "Users can manage own expenses"
  ON public.expenses FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Super admin can view all expenses"
  ON public.expenses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND super_admin = true
    )
  );

-- ---- CASH ON HAND POLICIES ----
ALTER TABLE public.cash_on_hand ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own cash on hand" ON public.cash_on_hand;
DROP POLICY IF EXISTS "Super admin can view all cash on hand" ON public.cash_on_hand;

CREATE POLICY "Users can manage own cash on hand"
  ON public.cash_on_hand FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Super admin can view all cash on hand"
  ON public.cash_on_hand FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND super_admin = true
    )
  );

-- ============================================================
-- INDEXES
-- ============================================================
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_lower_idx ON public.profiles (LOWER(email));
CREATE INDEX IF NOT EXISTS assets_user_id_idx ON public.assets (user_id);
CREATE INDEX IF NOT EXISTS savings_user_id_idx ON public.savings (user_id);
CREATE INDEX IF NOT EXISTS emergency_funds_user_id_idx ON public.emergency_funds (user_id);
CREATE INDEX IF NOT EXISTS expenses_user_id_idx ON public.expenses (user_id);
CREATE INDEX IF NOT EXISTS expenses_user_id_date_idx ON public.expenses (user_id, date DESC);
CREATE INDEX IF NOT EXISTS cash_on_hand_user_id_idx ON public.cash_on_hand (user_id);
CREATE INDEX IF NOT EXISTS cash_on_hand_user_id_date_idx ON public.cash_on_hand (user_id, date DESC);

-- ============================================================
-- GRANTS
-- ============================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.savings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.emergency_funds TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_on_hand TO authenticated;

-- ============================================================
-- SEED SUPER ADMIN
-- After running this schema, create the super admin user via
-- the Supabase Dashboard > Authentication > Users > Add User
-- Then run this UPDATE to make them super admin:
--
-- UPDATE public.profiles SET super_admin = true WHERE email = 'your@email.com';
--
-- ============================================================
