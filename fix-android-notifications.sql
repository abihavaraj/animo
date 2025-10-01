-- ============================================
-- Android Notification Token Fix - SQL Queries
-- ============================================

-- 1️⃣ DIAGNOSTIC QUERY - Check all push tokens and identify problem tokens
-- Run this FIRST to see the current state
-- ============================================

SELECT 
  id,
  name,
  email,
  role,
  CASE 
    WHEN push_token IS NULL THEN '❌ NULL - No token'
    WHEN push_token LIKE 'ExponentPushToken[%' THEN '✅ VALID - ExponentPushToken'
    WHEN push_token LIKE 'ExpoToken:%' THEN '⚠️ OLD - ExpoToken format'
    WHEN LENGTH(push_token) > 100 THEN '❌ INVALID - FCM Token (Android old format)'
    ELSE '❓ UNKNOWN - Unknown format'
  END as token_status,
  LEFT(push_token, 50) as token_preview,
  LENGTH(push_token) as token_length,
  created_at,
  updated_at
FROM users
WHERE push_token IS NOT NULL
ORDER BY 
  CASE 
    WHEN push_token LIKE 'ExponentPushToken[%' THEN 1  -- Valid tokens first
    WHEN push_token IS NULL THEN 2                      -- NULL tokens
    ELSE 0                                               -- Problem tokens at top
  END,
  updated_at DESC;

-- Expected results:
-- ✅ Valid: ExponentPushToken[xxxxxxxxxxxxxx]
-- ❌ Invalid: Very long FCM tokens (150+ chars) or old formats
-- Android users with invalid tokens are the problem!


-- 2️⃣ SUMMARY QUERY - Count tokens by type
-- Quick overview of token health
-- ============================================

SELECT 
  CASE 
    WHEN push_token IS NULL THEN '⚪ No Token'
    WHEN push_token LIKE 'ExponentPushToken[%' THEN '✅ Valid ExponentPushToken'
    WHEN push_token LIKE 'ExpoToken:%' THEN '⚠️ Old ExpoToken Format'
    WHEN LENGTH(push_token) > 100 THEN '❌ Invalid FCM Token'
    ELSE '❓ Unknown Format'
  END as token_type,
  COUNT(*) as user_count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM users WHERE push_token IS NOT NULL), 2) as percentage
FROM users
GROUP BY 
  CASE 
    WHEN push_token IS NULL THEN '⚪ No Token'
    WHEN push_token LIKE 'ExponentPushToken[%' THEN '✅ Valid ExponentPushToken'
    WHEN push_token LIKE 'ExpoToken:%' THEN '⚠️ Old ExpoToken Format'
    WHEN LENGTH(push_token) > 100 THEN '❌ Invalid FCM Token'
    ELSE '❓ Unknown Format'
  END
ORDER BY user_count DESC;

-- Shows breakdown of all token types and percentages


-- 3️⃣ FIND SPECIFIC USER TOKEN - Check individual user
-- Replace email with actual user email
-- ============================================

SELECT 
  name, 
  email,
  LEFT(push_token, 50) as token_preview,
  LENGTH(push_token) as token_length,
  CASE 
    WHEN push_token IS NULL THEN '❌ Missing'
    WHEN push_token LIKE 'ExponentPushToken[%' THEN '✅ Valid'
    WHEN LENGTH(push_token) > 100 THEN '❌ Old FCM'
    ELSE '⚠️ Invalid'
  END as token_status,
  updated_at as last_updated
FROM users
WHERE email = 'your-android-user@email.com';  -- ⚠️ CHANGE THIS EMAIL

-- Replace 'your-android-user@email.com' with actual user email


-- 4️⃣ IDENTIFY ANDROID USERS WITH PROBLEMS
-- Find users likely on Android with invalid tokens
-- ============================================

SELECT 
  name,
  email,
  LEFT(push_token, 40) as token_preview,
  LENGTH(push_token) as token_length,
  '❌ Needs Fix' as status,
  updated_at
FROM users
WHERE push_token IS NOT NULL
  AND NOT push_token LIKE 'ExponentPushToken[%'
ORDER BY updated_at DESC;

-- These users will be auto-fixed on next login with the new code


-- 5️⃣ OPTIONAL: FORCE TOKEN RESET FOR ALL INVALID TOKENS
-- ⚠️ USE WITH CAUTION - This clears invalid tokens
-- Users will auto-regenerate tokens on next login
-- ============================================

-- FIRST, check how many will be affected:
SELECT COUNT(*) as users_to_reset
FROM users
WHERE push_token IS NOT NULL
  AND NOT push_token LIKE 'ExponentPushToken[%';

-- Then, if you want to force reset:
-- UNCOMMENT the next query to execute:

/*
UPDATE users
SET push_token = NULL
WHERE push_token IS NOT NULL
  AND NOT push_token LIKE 'ExponentPushToken[%';

-- Returns: "UPDATE X" where X is number of users reset
-- These users will get fresh tokens on next app open
*/

-- ⚠️ NOTE: This is OPTIONAL. The App.tsx fix handles this automatically.


-- 6️⃣ VERIFY FIX WORKED - Run after Android user logs in
-- Check that token was updated to valid format
-- ============================================

SELECT 
  name,
  email,
  LEFT(push_token, 50) as token_preview,
  CASE 
    WHEN push_token LIKE 'ExponentPushToken[%' THEN '✅ FIXED!'
    ELSE '❌ Still Invalid'
  END as fix_status,
  updated_at as last_token_update
FROM users
WHERE email = 'your-android-user@email.com'  -- ⚠️ CHANGE THIS EMAIL
  OR id = 'user-id-here';                     -- OR use user ID

-- Should show ✅ FIXED! with token starting with ExponentPushToken[


-- 7️⃣ MONITOR TOKEN HEALTH OVER TIME
-- Run this daily to track progress
-- ============================================

SELECT 
  DATE(updated_at) as date,
  COUNT(*) FILTER (WHERE push_token LIKE 'ExponentPushToken[%') as valid_tokens,
  COUNT(*) FILTER (WHERE push_token IS NOT NULL AND NOT push_token LIKE 'ExponentPushToken[%') as invalid_tokens,
  COUNT(*) as total_tokens
FROM users
WHERE push_token IS NOT NULL
GROUP BY DATE(updated_at)
ORDER BY date DESC
LIMIT 7;

-- Track daily progress of token fixes


-- 8️⃣ USERS WITH NOTIFICATIONS ENABLED BUT INVALID TOKENS
-- Find users who expect notifications but have bad tokens
-- ============================================

SELECT 
  u.name,
  u.email,
  u.role,
  LEFT(u.push_token, 40) as token_preview,
  CASE 
    WHEN u.push_token IS NULL THEN '❌ No Token'
    WHEN u.push_token LIKE 'ExponentPushToken[%' THEN '✅ Valid'
    ELSE '❌ Invalid - Notifications will fail'
  END as notification_status,
  ns.enable_push_notifications,
  u.updated_at
FROM users u
LEFT JOIN notification_settings ns ON ns.user_id = u.id
WHERE (ns.enable_push_notifications = true OR ns.enable_push_notifications IS NULL)
  AND (u.push_token IS NULL OR NOT u.push_token LIKE 'ExponentPushToken[%')
ORDER BY u.updated_at DESC;

-- These users have notifications enabled but won't receive them


-- 9️⃣ RECENT TOKEN UPDATES
-- See recent token changes (useful for monitoring fix deployment)
-- ============================================

SELECT 
  name,
  email,
  LEFT(push_token, 50) as new_token,
  CASE 
    WHEN push_token LIKE 'ExponentPushToken[%' THEN '✅'
    ELSE '❌'
  END as status,
  updated_at as when_updated,
  AGE(NOW(), updated_at) as how_long_ago
FROM users
WHERE push_token IS NOT NULL
ORDER BY updated_at DESC
LIMIT 20;

-- Shows most recent token updates


-- 🔟 CLEANUP QUERY - Remove very old inactive tokens
-- Optional: Clean up tokens that haven't been updated in 90+ days
-- ============================================

-- FIRST, see how many would be affected:
SELECT COUNT(*) as old_inactive_tokens
FROM users
WHERE push_token IS NOT NULL
  AND updated_at < NOW() - INTERVAL '90 days';

-- Then, if you want to clean up:
-- UNCOMMENT to execute:

/*
UPDATE users
SET push_token = NULL
WHERE push_token IS NOT NULL
  AND updated_at < NOW() - INTERVAL '90 days';
*/

-- ============================================
-- END OF QUERIES
-- ============================================

-- 📋 QUICK REFERENCE GUIDE:
--
-- Use Query #1: To see all tokens and identify problems
-- Use Query #2: For quick overview of token health
-- Use Query #3: To check specific user
-- Use Query #4: To find all problem users
-- Use Query #5: To force reset (optional, not recommended)
-- Use Query #6: To verify fix worked after login
-- Use Query #7: To monitor progress over days
-- Use Query #8: To find users expecting notifications
-- Use Query #9: To see recent token updates
-- Use Query #10: To cleanup very old tokens (optional)

