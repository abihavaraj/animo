# 🔧 Android Notification Fix Guide

## Problem Summary

**Symptom:** Admin test notifications work on Android, but regular notifications don't arrive.

**Root Cause:** Android users have old FCM tokens in the database instead of valid `ExponentPushToken[...]` format. The notification service skips these invalid tokens.

**Why Admin Test Works:** The test screen generates a FRESH token every time, bypassing the stored token issue.

---

## Step 1: Identify Affected Users

Run this SQL query in Supabase SQL Editor to find users with invalid tokens:

```sql
-- See file: check-android-tokens.sql
```

You'll likely find Android users with:
- ❌ **FCM tokens** (very long strings, 150+ characters)
- ❌ **Old ExpoToken format** (starts with "ExpoToken:")
- ✅ **Valid ExponentPushToken** (starts with "ExponentPushToken[")

---

## Step 2: Force Token Re-registration on Android

The issue is that when Android users login, their tokens aren't being properly regenerated. We need to force Android to re-register tokens.

### Option A: Force Re-registration on Login (Recommended)

Update the token registration logic in `App.tsx` to force fresh tokens for Android users with invalid tokens.

### Option B: Manual Database Cleanup

Clear invalid tokens so users will get fresh ones on next login:

```sql
-- Clear old FCM and invalid tokens
UPDATE users
SET push_token = NULL
WHERE push_token IS NOT NULL
  AND NOT push_token LIKE 'ExponentPushToken[%';
  
-- Result: Users will get fresh tokens on next app open
```

---

## Step 3: Verify Token Format

After implementing the fix, verify tokens are correct:

```sql
SELECT 
  name,
  email,
  LEFT(push_token, 30) as token_preview,
  CASE 
    WHEN push_token LIKE 'ExponentPushToken[%' THEN '✅ Valid'
    ELSE '❌ Invalid'
  END as status
FROM users
WHERE push_token IS NOT NULL
ORDER BY updated_at DESC
LIMIT 10;
```

---

## Step 4: Test Notifications

1. **Test from Admin Panel**: Should work (already does)
2. **Test Regular Notifications**: 
   - Book a class
   - Join waitlist
   - Check if notification arrives

---

## ✅ Fix Implemented

### What Was Changed:

**File: `App.tsx`**

Added automatic token validation and re-registration:

1. **On Login**: Checks if user's stored token is valid
2. **Invalid Token Detection**: Identifies old FCM tokens or missing tokens
3. **Automatic Fix**: Forces token re-registration for invalid tokens
4. **Validation**: Only saves tokens in correct `ExponentPushToken[...]` format

### Code Changes:

```typescript
// Lines 116-147 in App.tsx

// ANDROID FIX: Validate and fix invalid tokens on login
setTimeout(async () => {
  const { data: userData } = await supabase
    .from('users')
    .select('push_token')
    .eq('id', user.id)
    .single();

  const storedToken = userData?.push_token;
  
  // Check if token is invalid (old FCM format or missing)
  const isInvalidToken = !storedToken || !storedToken.startsWith('ExponentPushToken[');
  
  if (isInvalidToken) {
    console.log('🔄 Forcing token re-registration...');
    await pushNotificationService.forceTokenReregistration();
    console.log('✅ Token re-registration completed');
  }
}, 2000);
```

Also added validation to the token listener (lines 158-172):
- Only saves tokens with valid `ExponentPushToken[...]` format
- Logs warnings for invalid tokens
- Provides detailed console logging for debugging

---

## 🧪 Testing the Fix

### Test on Android Device:

1. **Before Testing**: Check current token in database
   ```sql
   SELECT name, email, LEFT(push_token, 50) as token
   FROM users
   WHERE email = 'your-android-user@email.com';
   ```

2. **Login to App**: 
   - Open the app on Android
   - Watch the console logs:
     ```
     🔄 [App] User has invalid token format, forcing re-registration...
     📱 Old token: <old-fcm-token>...
     🤖 Platform: android
     ✅ [App] Token re-registration completed
     ```

3. **Verify New Token**:
   ```sql
   SELECT name, email, LEFT(push_token, 50) as token
   FROM users
   WHERE email = 'your-android-user@email.com';
   ```
   Should now show: `ExponentPushToken[...]`

4. **Test Regular Notification**:
   - Book a class OR
   - Join a waitlist OR
   - Have admin send a test notification
   - **Notification should arrive** ✅

### Monitor Logs:

Watch for these success indicators:
```
✅ [App] Token format is valid: ExponentPushToken[...]
✅ [App] Push token saved successfully
✅ [getPushTokenSafely] Got push token successfully
✅ [registerTokenWithServerSafely] Push token registered
```

---

## 🔍 Troubleshooting

### If notifications still don't work:

1. **Check Permissions**:
   - Settings > Apps > ANIMO Pilates > Notifications
   - Ensure all notification permissions are enabled

2. **Verify Token Format**:
   ```sql
   SELECT 
     email,
     CASE 
       WHEN push_token LIKE 'ExponentPushToken[%' THEN '✅ Valid'
       ELSE '❌ Invalid'
     END as status,
     LEFT(push_token, 50) as token
   FROM users
   WHERE email = 'problem-user@email.com';
   ```

3. **Force Manual Re-registration**:
   - Go to Admin > Notification Test Screen
   - Tap "Test Immediate Notification"
   - This will force fresh token generation

4. **Clear and Re-login**:
   - Logout from app
   - Clear app data (Android Settings)
   - Login again
   - New token will be generated

---

## 📊 Expected Results

After the fix:

| Device | Admin Test | Regular Notifications | Token Format |
|--------|-----------|----------------------|--------------|
| iPhone | ✅ Works  | ✅ Works             | ExponentPushToken[...] |
| Android (Before) | ✅ Works | ❌ Fails      | FCM Token (invalid) |
| Android (After) | ✅ Works | ✅ Works      | ExponentPushToken[...] |

---

## 🎯 Success Criteria

The fix is successful when:

1. ✅ Android users can receive booking confirmation notifications
2. ✅ Android users receive class reminders
3. ✅ Android users receive waitlist promotion notifications
4. ✅ All tokens in database have `ExponentPushToken[...]` format
5. ✅ Console shows "Token format is valid" on login

---

## 🔄 Rollout Plan

1. **Deploy the fix** (already done in App.tsx)
2. **Monitor first Android login**: Check console logs
3. **Verify database**: Run token check SQL query
4. **Test notifications**: Send test notifications to Android users
5. **Confirm success**: All Android users receive notifications

---

## 📝 Database Cleanup (Optional)

If you want to force all users to re-register on next login:

```sql
-- Clear all invalid tokens (they'll regenerate automatically)
UPDATE users
SET push_token = NULL
WHERE push_token IS NOT NULL
  AND NOT push_token LIKE 'ExponentPushToken[%';

-- Shows: "UPDATE X" where X is number of fixed users
```

This is safe and will force fresh token generation on next app open.

