-- ================================================
-- OPTIONAL: Add Status Tracking to Waitlist Table
-- ================================================
-- This migration adds status tracking to the waitlist table
-- for better reporting and analytics. This is OPTIONAL and only
-- needed if you want to keep historical waitlist data.
--
-- Benefits:
-- - Track waitlist conversion rates (promoted vs expired)
-- - Keep audit trail of all waitlist activity
-- - Analyze patterns and trends
-- - No data loss for reporting purposes
--
-- Run this ONLY if you want status-based waitlist tracking
-- ================================================

-- Step 1: Add status column
ALTER TABLE public.waitlist 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' 
CHECK (status IN ('active', 'promoted', 'expired', 'cancelled'));

-- Step 2: Add updated_at timestamp for tracking changes
ALTER TABLE public.waitlist 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Step 3: Add helpful comment
COMMENT ON COLUMN public.waitlist.status IS 
'Waitlist entry status: active (on waitlist), promoted (got spot), expired (class started, no spot), cancelled (user left)';

-- Step 4: Update existing entries to 'active' status
UPDATE public.waitlist 
SET status = 'active' 
WHERE status IS NULL;

-- Step 5: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_waitlist_status 
ON public.waitlist(status);

CREATE INDEX IF NOT EXISTS idx_waitlist_class_status 
ON public.waitlist(class_id, status);

CREATE INDEX IF NOT EXISTS idx_waitlist_updated_at 
ON public.waitlist(updated_at DESC);

-- Step 6: Create function to automatically mark expired waitlists
CREATE OR REPLACE FUNCTION mark_expired_waitlists()
RETURNS void AS $$
BEGIN
  -- Mark waitlists as expired for classes that have started
  UPDATE public.waitlist w
  SET 
    status = 'expired',
    updated_at = NOW()
  FROM public.classes c
  WHERE w.class_id = c.id
    AND w.status = 'active'
    AND (
      -- Class date has passed
      c.date < CURRENT_DATE
      OR
      -- Class has started (date is today and time has passed)
      (c.date = CURRENT_DATE AND c.time < CURRENT_TIME)
    );
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_waitlist_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_waitlist_updated_at ON public.waitlist;
CREATE TRIGGER trigger_waitlist_updated_at
  BEFORE UPDATE ON public.waitlist
  FOR EACH ROW
  EXECUTE FUNCTION update_waitlist_updated_at();

-- ================================================
-- OPTIONAL: Create scheduled job to mark expired waitlists
-- ================================================
-- Uncomment and modify this section if you want automatic cleanup
-- This requires pg_cron extension to be enabled

/*
-- Enable pg_cron extension (run as superuser)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule function to run daily at 2 AM
SELECT cron.schedule(
  'mark-expired-waitlists',
  '0 2 * * *',  -- Every day at 2 AM
  'SELECT mark_expired_waitlists();'
);
*/

-- ================================================
-- OPTIONAL: Cleanup old waitlist entries periodically
-- ================================================
-- Run this manually or schedule it to clean up old data

-- Example: Delete expired/cancelled waitlist entries older than 6 months
/*
DELETE FROM public.waitlist 
WHERE status IN ('expired', 'cancelled', 'promoted')
  AND updated_at < NOW() - INTERVAL '6 months';
*/

-- ================================================
-- Usage Examples
-- ================================================

-- 1. Get all active waitlists
-- SELECT * FROM waitlist WHERE status = 'active';

-- 2. Get waitlist conversion rate for a specific class
-- SELECT 
--   class_id,
--   COUNT(*) FILTER (WHERE status = 'promoted') as promoted_count,
--   COUNT(*) FILTER (WHERE status = 'expired') as expired_count,
--   COUNT(*) as total_count,
--   ROUND(
--     COUNT(*) FILTER (WHERE status = 'promoted')::numeric / 
--     NULLIF(COUNT(*), 0) * 100, 
--     2
--   ) as conversion_rate_percent
-- FROM waitlist
-- WHERE class_id = 'YOUR_CLASS_ID'
-- GROUP BY class_id;

-- 3. Get classes with high waitlist demand
-- SELECT 
--   c.name,
--   c.date,
--   COUNT(w.id) as total_waitlist,
--   COUNT(*) FILTER (WHERE w.status = 'expired') as missed_spots
-- FROM classes c
-- LEFT JOIN waitlist w ON c.id = w.class_id
-- WHERE w.status IN ('promoted', 'expired')
-- GROUP BY c.id, c.name, c.date
-- HAVING COUNT(w.id) > 3
-- ORDER BY total_waitlist DESC;

-- 4. Manually mark a waitlist as promoted (when someone gets a spot)
-- UPDATE waitlist 
-- SET status = 'promoted', updated_at = NOW() 
-- WHERE id = 'WAITLIST_ID';

-- 5. Manually mark a waitlist as cancelled (when user leaves)
-- UPDATE waitlist 
-- SET status = 'cancelled', updated_at = NOW() 
-- WHERE id = 'WAITLIST_ID';

-- ================================================
-- Verification
-- ================================================

-- Check that the columns were added successfully
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'waitlist' 
  AND column_name IN ('status', 'updated_at')
ORDER BY ordinal_position;

-- Check that indexes were created
SELECT 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE tablename = 'waitlist' 
  AND indexname LIKE '%status%'
ORDER BY indexname;

-- ================================================
-- Rollback (if needed)
-- ================================================
-- Uncomment below to rollback this migration

/*
-- Drop triggers
DROP TRIGGER IF EXISTS trigger_waitlist_updated_at ON public.waitlist;

-- Drop functions
DROP FUNCTION IF EXISTS update_waitlist_updated_at();
DROP FUNCTION IF EXISTS mark_expired_waitlists();

-- Drop indexes
DROP INDEX IF EXISTS idx_waitlist_status;
DROP INDEX IF EXISTS idx_waitlist_class_status;
DROP INDEX IF EXISTS idx_waitlist_updated_at;

-- Remove columns
ALTER TABLE public.waitlist DROP COLUMN IF EXISTS status;
ALTER TABLE public.waitlist DROP COLUMN IF EXISTS updated_at;

-- Remove cron job (if created)
-- SELECT cron.unschedule('mark-expired-waitlists');
*/

