-- Fix referral_source constraint to allow custom text
-- Migration: 004_fix_referral_source_constraint.sql

-- Drop the existing constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_referral_source_check;

-- Add a new constraint that allows any text value (including custom text for "other")
ALTER TABLE public.users ADD CONSTRAINT users_referral_source_check 
CHECK (referral_source IS NULL OR referral_source = '' OR LENGTH(referral_source) > 0);

-- Update the comment to reflect the change
COMMENT ON COLUMN public.users.referral_source IS 'Source through which the client heard about Animo Pilates Studio (can be predefined values or custom text)'; 