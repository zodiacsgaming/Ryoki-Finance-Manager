-- ============================================================
-- FINANCE TRACKER - OPTIONAL SEED / ADMIN SETUP
-- Run these AFTER supabase/schema.sql
-- ============================================================

-- 1. First create your user in Supabase:
-- Authentication -> Users -> Add user
-- Use the same email/password you want for the app owner.

-- 2. Promote that user to super admin
-- Replace the email below with your real email before running.
UPDATE public.profiles
SET role = 'super_admin', is_active = true
WHERE email = 'your@email.com';

-- 3. Optional: starter sample data for that same user
-- Replace the email once, then run this block if you want demo data.
WITH owner AS (
  SELECT id
  FROM public.profiles
  WHERE email = 'your@email.com'
)
INSERT INTO public.assets (user_id, name, category, value, notes)
SELECT id, 'Wallet Cash', 'Cash', 2500.00, 'Starter sample asset'
FROM owner
WHERE NOT EXISTS (
  SELECT 1
  FROM public.assets a
  WHERE a.user_id = owner.id
    AND a.name = 'Wallet Cash'
);

WITH owner AS (
  SELECT id
  FROM public.profiles
  WHERE email = 'your@email.com'
)
INSERT INTO public.savings (user_id, title, target_amount, current_amount, notes)
SELECT id, 'Laptop Fund', 60000.00, 15000.00, 'Starter sample saving goal'
FROM owner
WHERE NOT EXISTS (
  SELECT 1
  FROM public.savings s
  WHERE s.user_id = owner.id
    AND s.title = 'Laptop Fund'
);

WITH owner AS (
  SELECT id
  FROM public.profiles
  WHERE email = 'your@email.com'
)
INSERT INTO public.emergency_funds (user_id, name, target_amount, current_amount, notes)
SELECT id, '6-Month Buffer', 120000.00, 30000.00, 'Starter sample emergency fund'
FROM owner
WHERE NOT EXISTS (
  SELECT 1
  FROM public.emergency_funds e
  WHERE e.user_id = owner.id
    AND e.name = '6-Month Buffer'
);

WITH owner AS (
  SELECT id
  FROM public.profiles
  WHERE email = 'your@email.com'
)
INSERT INTO public.expenses (user_id, title, amount, category, payment_method, date, notes)
SELECT id, 'Groceries', 1850.00, 'Food', 'E-Wallet', CURRENT_DATE, 'Starter sample expense'
FROM owner
WHERE NOT EXISTS (
  SELECT 1
  FROM public.expenses ex
  WHERE ex.user_id = owner.id
    AND ex.title = 'Groceries'
    AND ex.date = CURRENT_DATE
);
