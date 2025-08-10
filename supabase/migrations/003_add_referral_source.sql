-- Add referral_source column to users table
-- Migration: 003_add_referral_source.sql

-- Add referral_source column to users table
ALTER TABLE public.users 
ADD COLUMN referral_source TEXT CHECK(referral_source IN (
  'google_search', 
  'social_media', 
  'friend_referral', 
  'website', 
  'instagram', 
  'facebook', 
  'local_ad', 
  'word_of_mouth', 
  'flyer', 
  'event', 
  'other'
));

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_users_referral_source ON public.users(referral_source);

-- Add comment to document the column
COMMENT ON COLUMN public.users.referral_source IS 'Source through which the client heard about Animo Pilates Studio'; 