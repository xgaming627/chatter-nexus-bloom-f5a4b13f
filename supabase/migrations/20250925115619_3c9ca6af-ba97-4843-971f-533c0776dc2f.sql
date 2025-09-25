-- Add do_not_disturb column to profiles table if it doesn't exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS do_not_disturb boolean DEFAULT false;