-- ============================================
-- Fix RLS Policies for Multi-Device Push Notification Support
-- ============================================
-- This allows users to register tokens from multiple devices
-- (Android + iPhone) and receive notifications on both

-- 1️⃣ Enable RLS on push_tokens table (if not already enabled)
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- 2️⃣ Drop existing policies if they exist (to start fresh)
DROP POLICY IF EXISTS "Users can view their own push tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can insert their own push tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can update their own push tokens" ON push_tokens;
DROP POLICY IF EXISTS "Users can delete their own push tokens" ON push_tokens;
DROP POLICY IF EXISTS "Admins can view all push tokens" ON push_tokens;

-- 3️⃣ CREATE NEW POLICIES

-- Allow users to INSERT their own push tokens (for new devices)
CREATE POLICY "Users can insert their own push tokens"
ON push_tokens
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to UPDATE their own push tokens (for token refresh)
CREATE POLICY "Users can update their own push tokens"
ON push_tokens
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to VIEW their own push tokens
CREATE POLICY "Users can view their own push tokens"
ON push_tokens
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow users to DELETE their own push tokens (for logout/device removal)
CREATE POLICY "Users can delete their own push tokens"
ON push_tokens
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Allow admins to view all push tokens (for debugging)
CREATE POLICY "Admins can view all push tokens"
ON push_tokens
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'reception')
  )
);

-- 4️⃣ VERIFY POLICIES WERE CREATED
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'push_tokens'
ORDER BY policyname;

-- Expected output:
-- ✅ Users can insert their own push tokens
-- ✅ Users can update their own push tokens  
-- ✅ Users can view their own push tokens
-- ✅ Users can delete their own push tokens
-- ✅ Admins can view all push tokens

-- 5️⃣ TEST THE POLICIES
-- Run this as a test user to verify policies work:
/*
-- Test as authenticated user
SET ROLE authenticated;
SET request.jwt.claim.sub = 'your-user-id-here';

-- Try to insert a test token (should succeed)
INSERT INTO push_tokens (user_id, token, device_type, device_id, device_name)
VALUES (
  'your-user-id-here',
  'ExponentPushToken[test]',
  'android',
  'test-device-id',
  'Test Device'
);

-- Clean up test
DELETE FROM push_tokens WHERE token = 'ExponentPushToken[test]';
RESET ROLE;
*/

-- ============================================
-- EXPLANATION: Why This Fixes Multi-Device Support
-- ============================================

/*
BEFORE (single token in users table):
  - User logs in on Android → saves token to users.push_token
  - User logs in on iPhone → OVERWRITES users.push_token
  - Only iPhone receives notifications ❌

AFTER (multi-device support with push_tokens table):
  - User logs in on Android → saves to push_tokens with device_type='android'
  - User logs in on iPhone → saves to push_tokens with device_type='ios'
  - BOTH devices receive notifications ✅
  
The push_tokens table has these columns:
  - user_id: Links to the user
  - token: The unique push token (with UNIQUE constraint)
  - device_type: 'ios' or 'android'
  - device_id: Unique device identifier
  - device_name: Human-readable device name
  - is_active: Whether this token is still valid
  - last_used_at: Last time token was used
  
When sending notifications, we query ALL active tokens for a user:
  SELECT token FROM push_tokens 
  WHERE user_id = 'xxx' AND is_active = true;
  
This returns multiple tokens (one per device), and we send to all of them!
*/

-- ============================================
-- OPTIONAL: Migrate existing tokens from users table
-- ============================================

/*
-- Copy existing tokens from users.push_token to push_tokens table
-- This preserves current tokens while enabling multi-device support

INSERT INTO push_tokens (user_id, token, device_type, device_name, is_active)
SELECT 
  id as user_id,
  push_token as token,
  CASE 
    WHEN push_token LIKE '%iOS%' OR push_token LIKE '%Apple%' THEN 'ios'
    ELSE 'android'
  END as device_type,
  'Migrated Device' as device_name,
  true as is_active
FROM users
WHERE push_token IS NOT NULL
  AND push_token LIKE 'ExponentPushToken[%'
  AND NOT EXISTS (
    -- Don't duplicate if already in push_tokens
    SELECT 1 FROM push_tokens 
    WHERE push_tokens.token = users.push_token
  );

-- After migration, you can optionally clear users.push_token
-- (The app will continue to update it, but we'll use push_tokens as primary)
*/

