-- Add 'completed' status option to classes table
-- This allows classes to be marked as completed when they finish

-- First, check if 'completed' is already in the status constraint
DO $$ 
BEGIN
    -- Drop the existing constraint if it exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.constraint_column_usage 
        WHERE table_name = 'classes' 
        AND constraint_name LIKE '%status%'
    ) THEN
        ALTER TABLE public.classes DROP CONSTRAINT IF EXISTS classes_status_check;
    END IF;
    
    -- Add the new constraint with 'completed' status
    ALTER TABLE public.classes 
    ADD CONSTRAINT classes_status_check 
    CHECK (status IN ('active', 'cancelled', 'full', 'completed'));
    
EXCEPTION WHEN OTHERS THEN
    -- If there's an error, just try to add the constraint directly
    ALTER TABLE public.classes DROP CONSTRAINT IF EXISTS classes_status_check;
    ALTER TABLE public.classes 
    ADD CONSTRAINT classes_status_check 
    CHECK (status IN ('active', 'cancelled', 'full', 'completed'));
END $$;

-- Create a function to automatically update class status when they finish
CREATE OR REPLACE FUNCTION update_completed_class_status()
RETURNS void AS $$
BEGIN
    -- Update classes that have ended (current time > class end time) to 'completed' status
    UPDATE public.classes 
    SET 
        status = 'completed',
        updated_at = NOW()
    WHERE 
        status = 'active' 
        AND (
            EXTRACT(EPOCH FROM (NOW() - (date + time + (duration || ' minutes')::interval))) > 0
        );
        
    -- Log how many classes were updated
    RAISE NOTICE 'Updated % classes to completed status', (
        SELECT COUNT(*) 
        FROM public.classes 
        WHERE status = 'completed' 
        AND updated_at > NOW() - INTERVAL '1 minute'
    );
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_completed_class_status() TO authenticated;
GRANT EXECUTE ON FUNCTION update_completed_class_status() TO service_role;

-- Create an index on classes for efficient status and date queries
CREATE INDEX IF NOT EXISTS idx_classes_status_date_time 
ON public.classes (status, date, time);

-- Add a comment explaining the completed status
COMMENT ON COLUMN public.classes.status IS 'Class status: active (ongoing/future), cancelled (cancelled by admin), full (at capacity), completed (finished)';