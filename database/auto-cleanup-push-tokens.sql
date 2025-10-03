-- ================================================
-- AUTOMATIC PUSH TOKEN CLEANUP
-- ================================================
-- This creates a database function + trigger that automatically
-- cleans up old push tokens when new ones are registered
-- ================================================

-- PART 1: Function to deactivate old tokens when new token is registered
-- ================================================
CREATE OR REPLACE FUNCTION deactivate_old_push_tokens()
RETURNS TRIGGER AS $$
BEGIN
  -- When a new token is inserted or updated for a user
  -- Mark all OTHER tokens for this user as inactive
  -- (except the new one being inserted)
  
  UPDATE push_tokens
  SET 
    is_active = false,
    updated_at = NOW()
  WHERE 
    user_id = NEW.user_id
    AND token != NEW.token
    AND is_active = true;
  
  -- Log the cleanup (optional)
  RAISE NOTICE 'Deactivated old tokens for user %', NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- PART 2: Create trigger on push_tokens table
-- ================================================
DROP TRIGGER IF EXISTS trigger_deactivate_old_tokens ON push_tokens;

CREATE TRIGGER trigger_deactivate_old_tokens
  AFTER INSERT OR UPDATE OF token, is_active
  ON push_tokens
  FOR EACH ROW
  WHEN (NEW.is_active = true)
  EXECUTE FUNCTION deactivate_old_push_tokens();

-- ================================================
-- PART 3: Mark invalid token formats as inactive immediately
-- ================================================
CREATE OR REPLACE FUNCTION validate_push_token_format()
RETURNS TRIGGER AS $$
BEGIN
  -- If token doesn't start with 'ExponentPushToken[', mark it inactive
  IF NEW.token IS NOT NULL AND NEW.token NOT LIKE 'ExponentPushToken[%' THEN
    NEW.is_active = false;
    RAISE NOTICE 'Invalid token format detected, marking inactive: %', substring(NEW.token, 1, 20);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_token_format ON push_tokens;

CREATE TRIGGER trigger_validate_token_format
  BEFORE INSERT OR UPDATE OF token
  ON push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION validate_push_token_format();

-- ================================================
-- PART 4: Scheduled cleanup function for very old tokens
-- ================================================
-- This can be called manually or scheduled with pg_cron
CREATE OR REPLACE FUNCTION cleanup_very_old_push_tokens()
RETURNS TABLE(
  deleted_count INTEGER,
  marked_inactive_count INTEGER
) AS $$
DECLARE
  v_deleted_count INTEGER;
  v_marked_inactive INTEGER;
BEGIN
  -- Mark tokens older than 90 days as inactive
  UPDATE push_tokens
  SET 
    is_active = false,
    updated_at = NOW()
  WHERE 
    is_active = true
    AND updated_at < NOW() - INTERVAL '90 days';
  
  GET DIAGNOSTICS v_marked_inactive = ROW_COUNT;
  
  -- Delete inactive tokens older than 180 days (keep for audit trail)
  DELETE FROM push_tokens
  WHERE 
    is_active = false
    AND updated_at < NOW() - INTERVAL '180 days';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  -- Return results
  RETURN QUERY SELECT v_deleted_count, v_marked_inactive;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- PART 5: One-time cleanup of existing garbage
-- ================================================
-- Clean up the 68 invalid tokens you have right now
UPDATE push_tokens
SET 
  is_active = false,
  updated_at = NOW()
WHERE 
  token NOT LIKE 'ExponentPushToken[%'
  OR token IS NULL;

-- Also clean users.push_token table
UPDATE users
SET 
  push_token = NULL,
  updated_at = NOW()
WHERE 
  push_token IS NOT NULL
  AND push_token NOT LIKE 'ExponentPushToken[%';

-- ================================================
-- VERIFICATION QUERIES
-- ================================================
-- Run these after setup to verify it's working

-- Check current status
SELECT 
  COUNT(*) FILTER (WHERE is_active = true AND token LIKE 'ExponentPushToken[%') as active_valid,
  COUNT(*) FILTER (WHERE is_active = true AND token NOT LIKE 'ExponentPushToken[%') as active_invalid,
  COUNT(*) FILTER (WHERE is_active = false) as inactive,
  COUNT(*) as total
FROM push_tokens;

-- Check recent cleanup activity
SELECT 
  user_id,
  COUNT(*) as total_tokens,
  COUNT(*) FILTER (WHERE is_active = true) as active_tokens,
  COUNT(*) FILTER (WHERE is_active = false) as inactive_tokens,
  MAX(updated_at) as last_update
FROM push_tokens
GROUP BY user_id
HAVING COUNT(*) > 1
ORDER BY total_tokens DESC
LIMIT 10;

-- ================================================
-- HOW TO USE
-- ================================================
-- 1. Run this entire script in Supabase SQL Editor
-- 2. Done! Cleanup is now automatic
-- 3. Optionally, schedule manual cleanup:
--    SELECT * FROM cleanup_very_old_push_tokens();
-- ================================================

-- ================================================
-- OPTIONAL: Schedule with pg_cron (if available)
-- ================================================
-- Uncomment if you have pg_cron extension enabled
/*
SELECT cron.schedule(
  'cleanup-old-push-tokens',
  '0 2 * * *', -- Run daily at 2 AM
  $$SELECT cleanup_very_old_push_tokens();$$
);
*/

