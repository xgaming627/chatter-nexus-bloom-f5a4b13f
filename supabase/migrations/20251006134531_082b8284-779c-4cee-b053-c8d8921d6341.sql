-- Add free trial tracking to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS free_trial_claimed BOOLEAN DEFAULT FALSE;