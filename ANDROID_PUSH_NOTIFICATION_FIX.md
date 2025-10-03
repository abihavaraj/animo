# Android Push Notification Production Fix

## Problem Summary
- ✅ In-app notifications (notification panel) are working
- ❌ Actual push notifications are NOT reaching Android devices
- Users only see notifications when they open the app

## How It Works

### Token Registration Flow (Automatic Platform Detection)
1. **User logs in on Android:**
   - App detects platform: `Platform.OS === 'android'`
   - Requests push token from Expo using FCM
   - Saves token to database in format: `ExponentPushToken[xxxxxxxxxx]`
   - Token stored in both `users.push_token` and `push_tokens` table

2. **System automatically detects iOS vs Android:**
   - Yes! The code uses `Platform.OS` throughout
   - Android uses FCM (Firebase Cloud Messaging)
   - iOS uses APNs (Apple Push Notification service)
   - Same token format for both: `ExponentPushToken[...]`

## Root Cause: FCM Not Configured in Expo

For Android push notifications to work in production, you MUST upload your FCM Server Key to Expo.

## Step-by-Step Fix

### Step 1: Get Your FCM Server Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **animostudio-3b804**
3. Click the gear icon ⚙️ → **Project Settings**
4. Go to **Cloud Messaging** tab
5. Find **Cloud Messaging API (Legacy)** section
6. Copy the **Server Key** (starts with `AAAA...`)

**⚠️ IMPORTANT:** If "Cloud Messaging API (Legacy)" is disabled:
- You need to enable it in Google Cloud Console
- Go to: https://console.cloud.google.com/apis/library/fcm.googleapis.com
- Enable "Firebase Cloud Messaging API"

### Step 2: Upload FCM Server Key to Expo

Option A: **Using EAS CLI (Recommended)**
```bash
# Install EAS CLI if not already installed
npm install -g eas-cli

# Login to Expo
eas login

# Configure FCM credentials
eas credentials

# Select: Android → Push Notifications → Upload FCM Server Key
# Paste the Server Key from Step 1
```

Option B: **Using Expo Dashboard**
1. Go to: https://expo.dev/accounts/argjendi96/projects/PilatesStudioApp/credentials
2. Click on **Android** platform
3. Find **Push Notifications Credentials**
4. Click **Add FCM Server Key**
5. Paste your Server Key

### Step 3: Verify Configuration

After uploading the FCM Server Key, rebuild your Android app:

```bash
# Build new production APK/AAB
eas build --platform android --profile production
```

**⚠️ CRITICAL:** You MUST rebuild and republish to Google Play Store for the FCM configuration to take effect.

### Step 4: Test Push Notifications

After users install the new build, you can test using the admin panel:

1. Login as admin
2. Go to **Notification Test Screen** (if available)
3. Send a test notification to a specific user
4. User should receive push notification even when app is closed

## Diagnostic Checklist

Run through this checklist to verify everything:

### ✅ Check 1: FCM Server Key Uploaded
```bash
eas credentials
# Select Android → Push Notifications
# Verify "FCM Server Key" is present
```

### ✅ Check 2: Verify Push Tokens Are Being Generated

**CRITICAL:** Check for invalid token formats in your database!

Run this in Supabase SQL Editor:
```sql
-- Check for VALID Expo tokens (these will work)
SELECT id, email, push_token, 'VALID' as status
FROM users 
WHERE push_token LIKE 'ExponentPushToken[%'
LIMIT 10;

-- Check for INVALID old FCM tokens (these WON'T work!)
SELECT id, email, push_token, 'INVALID - OLD FCM' as status
FROM users 
WHERE push_token IS NOT NULL 
  AND push_token NOT LIKE 'ExponentPushToken[%'
LIMIT 10;

-- Summary
SELECT 
    COUNT(CASE WHEN push_token LIKE 'ExponentPushToken[%' THEN 1 END) as valid_tokens,
    COUNT(CASE WHEN push_token NOT LIKE 'ExponentPushToken[%' THEN 1 END) as invalid_tokens
FROM users WHERE push_token IS NOT NULL;
```

**Token Format Examples:**
- ✅ VALID: `ExponentPushToken[JIPCpMMxa6lUD1TanBBsKm]`
- ❌ INVALID: `f6cde98fa66feca3368b52a2e613970696f9461db63a5ab55acdc5237709439e` (old FCM format)

### ✅ Check 3: Verify google-services.json Matches

Ensure `google-services.json` in your project matches your Firebase project:
- **Package Name:** `com.animo.pilatesstudio` ✅
- **Project ID:** `animostudio-3b804` ✅
- **App ID:** `1:352036358458:android:ced3b56f3c9a31810ea803` ✅

### ✅ Check 4: Test Push Notification Manually

You can test push notifications manually using this PowerShell command:

```powershell
# Replace TOKEN with a user's actual push token from database
$token = "ExponentPushToken[XXXXXXXXXXXXXX]"

$body = @{
    to = $token
    title = "Test Notification"
    body = "Testing Android push notifications!"
    sound = "default"
    priority = "high"
    channelId = "animo-notifications"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://exp.host/--/api/v2/push/send" `
    -Method POST `
    -Headers @{"Content-Type"="application/json"} `
    -Body $body
```

Expected response:
```json
{
  "data": [
    {
      "status": "ok",
      "id": "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
    }
  ]
}
```

## Common Issues & Solutions

### Issue 1: "Invalid push token" error OR Users have old FCM tokens
**Cause:** User has old FCM token format (not ExponentPushToken)

**Examples:**
- ❌ Old FCM: `f6cde98fa66feca3368b52a2e613970696f9461db63a5ab55acdc5237709439e`
- ✅ New Expo: `ExponentPushToken[JIPCpMMxa6lUD1TanBBsKm]`

**Solution A - Automatic (Recommended):**
Your app already handles this automatically:
1. On login, app checks if token is invalid (App.tsx lines 116-147)
2. If invalid, app automatically requests new token
3. Users just need to logout and login again

**Solution B - Mass Cleanup (If many users affected):**
Use the provided SQL script to clear all invalid tokens:

```sql
-- Run this in Supabase SQL Editor
-- This clears old FCM tokens and forces re-registration
UPDATE users
SET push_token = NULL
WHERE push_token IS NOT NULL
  AND push_token NOT LIKE 'ExponentPushToken[%';

-- Then send in-app notification to all users:
-- "Please logout and login again to enable push notifications"
```

See `fix-invalid-push-tokens.sql` for detailed diagnostics and cleanup script.

### Issue 2: Notifications work in development but not production
**Cause:** FCM Server Key not uploaded to Expo for production
**Solution:** Follow Step 2 above

### Issue 3: "DeviceNotRegistered" error
**Cause:** User uninstalled and reinstalled app, old token is invalid
**Solution:** 
- Automatic - code marks tokens as inactive (line 908 in notificationService.ts)
- User needs to logout and login to get new token

### Issue 4: Notifications delayed or not received
**Cause:** Android battery optimization killing background processes
**Solution:** Ask users to:
1. Go to Android Settings → Apps → ANIMO
2. Battery → Unrestricted
3. Notifications → Allow all

## Current Code Status

Your code is correct and handles everything properly:

✅ **Automatic platform detection** (iOS/Android)
✅ **Multi-device support** (push_tokens table)
✅ **Token fallback** (users.push_token)
✅ **Token validation** (ExponentPushToken format check)
✅ **Automatic re-registration** on login
✅ **Proper Android channels** (animo-notifications)
✅ **Translation support** (per-user language)

**The ONLY missing piece is the FCM Server Key in Expo.**

## Immediate Action Required

1. **Upload FCM Server Key to Expo** (Steps 1-2 above)
2. **Build new version:**
   ```bash
   # Increment version in app.json
   # Currently: "versionCode": 27
   # Change to: "versionCode": 28
   
   eas build --platform android --profile production
   ```
3. **Submit to Google Play Store**
4. **Notify users to update the app**

## Verification After Fix

After users update to the new build:

1. User logs in → Token generated and saved
2. Admin/instructor makes an action (e.g., cancels class)
3. User receives **immediate push notification** on their Android device
4. Notification also appears in in-app notification panel

## Need Help?

If push notifications still don't work after uploading FCM Server Key:

1. Check Expo dashboard for push notification errors
2. Check Firebase Console → Cloud Messaging → Usage statistics
3. Enable debug logging in production to see detailed logs
4. Test with the PowerShell command to isolate the issue

## Additional Resources

- [Expo Push Notifications Guide](https://docs.expo.dev/push-notifications/overview/)
- [FCM Setup for Expo](https://docs.expo.dev/push-notifications/push-notifications-setup/)
- [EAS Credentials](https://docs.expo.dev/app-signing/managed-credentials/)

