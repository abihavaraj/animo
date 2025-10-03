-- ================================================
-- ANIMO Push Token Diagnostic and Cleanup Script
-- ================================================
-- This script identifies users with invalid push tokens
-- and helps clean up old FCM tokens so users can re-register
-- ================================================

-- STEP 1: Identify users with CORRECT Expo tokens
-- These users should receive push notifications
SELECT 
    id,
    email,
    name,
    role,
    push_token,
    'VALID - Expo Token' as token_status
FROM users
WHERE push_token LIKE 'ExponentPushToken[%'
ORDER BY created_at DESC;

-- Count of valid tokens
SELECT 
    COUNT(*) as valid_expo_tokens
FROM users
WHERE push_token LIKE 'ExponentPushToken[%';

-- ================================================

-- STEP 2: Identify users with INVALID old FCM tokens
-- These users will NOT receive push notifications!
SELECT 
    id,
    email,
    name,
    role,
    push_token,
    'INVALID - Old FCM Token' as token_status,
    LENGTH(push_token) as token_length
FROM users
WHERE push_token IS NOT NULL
  AND push_token NOT LIKE 'ExponentPushToken[%'
ORDER BY created_at DESC;

-- Count of invalid tokens
SELECT 
    COUNT(*) as invalid_fcm_tokens
FROM users
WHERE push_token IS NOT NULL
  AND push_token NOT LIKE 'ExponentPushToken[%';

-- ================================================

-- STEP 3: Summary statistics
SELECT 
    COUNT(CASE WHEN push_token LIKE 'ExponentPushToken[%' THEN 1 END) as valid_expo_tokens,
    COUNT(CASE WHEN push_token IS NOT NULL AND push_token NOT LIKE 'ExponentPushToken[%' THEN 1 END) as invalid_fcm_tokens,
    COUNT(CASE WHEN push_token IS NULL THEN 1 END) as no_token,
    COUNT(*) as total_users
FROM users;

-- ================================================

-- STEP 4: Fix - Clear invalid tokens so users can re-register
-- ⚠️ IMPORTANT: This will force users with old tokens to re-register
-- ⚠️ They need to logout and login again to get a new valid token
-- ⚠️ Uncomment the UPDATE statement below when ready to execute

-- Option A: Clear ALL invalid FCM tokens
-- This is the recommended approach - forces re-registration
/*
UPDATE users
SET push_token = NULL
WHERE push_token IS NOT NULL
  AND push_token NOT LIKE 'ExponentPushToken[%';
*/

-- To execute the fix:
-- 1. Remove the /* and */ comment markers above
-- 2. Run the UPDATE statement
-- 3. Users will automatically re-register on next login

-- ================================================

-- STEP 5: After running the fix, verify cleanup
-- Run this after executing the UPDATE to verify all tokens are valid
SELECT 
    CASE 
        WHEN push_token LIKE 'ExponentPushToken[%' THEN 'Valid Expo Token'
        WHEN push_token IS NULL THEN 'No Token (Will register on login)'
        ELSE 'Still has invalid token'
    END as token_status,
    COUNT(*) as user_count
FROM users
GROUP BY token_status
ORDER BY user_count DESC;

-- ================================================

-- STEP 6: Monitor token re-registration
-- Run this periodically to see how many users have re-registered
SELECT 
    DATE(created_at) as registration_date,
    COUNT(CASE WHEN push_token LIKE 'ExponentPushToken[%' THEN 1 END) as valid_tokens,
    COUNT(CASE WHEN push_token IS NULL THEN 1 END) as no_token,
    COUNT(*) as total_users
FROM users
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY registration_date DESC;

-- ================================================
-- NOTES:
-- ================================================
-- 1. Users with NULL push_token will automatically get a new token on login
-- 2. The app's code (App.tsx lines 116-147) handles re-registration automatically
-- 3. After cleanup, send users an in-app notification asking them to logout/login
-- 4. Push notifications will only work for users with ExponentPushToken format
-- ================================================

