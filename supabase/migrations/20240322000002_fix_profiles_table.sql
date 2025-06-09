-- Fix profiles table structure
-- 1. Rename update_at to updated_at
-- 2. Change timestamp types to timestamp with time zone
-- 3. Add NOT NULL constraints and defaults

-- First, rename the column
ALTER TABLE public.profiles 
RENAME COLUMN update_at TO updated_at;

-- Change the data types to timestamp with time zone
ALTER TABLE public.profiles 
ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE USING created_at AT TIME ZONE 'UTC',
ALTER COLUMN updated_at TYPE TIMESTAMP WITH TIME ZONE USING updated_at AT TIME ZONE 'UTC';

-- Add NOT NULL constraints and defaults if they don't exist
ALTER TABLE public.profiles 
ALTER COLUMN created_at SET DEFAULT timezone('utc'::text, now()),
ALTER COLUMN updated_at SET DEFAULT timezone('utc'::text, now());

-- Update any NULL values with current timestamp
UPDATE public.profiles 
SET 
  created_at = timezone('utc'::text, now())
WHERE created_at IS NULL;

UPDATE public.profiles 
SET 
  updated_at = timezone('utc'::text, now())
WHERE updated_at IS NULL;

-- Add NOT NULL constraints
ALTER TABLE public.profiles 
ALTER COLUMN created_at SET NOT NULL,
ALTER COLUMN updated_at SET NOT NULL;

-- Create the handle_updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic updated_at handling
DROP TRIGGER IF EXISTS handle_profiles_updated_at ON public.profiles;
CREATE TRIGGER handle_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at(); 