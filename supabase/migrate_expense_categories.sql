-- ============================================================
-- MIGRATION: Add Savings, Cash on Hand, Emergency Fund categories
-- Run this in the Supabase SQL Editor on your live database
-- ============================================================

-- Drop the old CHECK constraint and add a new one with the extra categories
ALTER TABLE public.expenses
  DROP CONSTRAINT IF EXISTS expenses_category_check;

ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_category_check
  CHECK (category IN (
    'Food', 'Transportation', 'Bills', 'Shopping', 'Rent', 'Others',
    'Savings', 'Cash on Hand', 'Emergency Fund'
  ));
