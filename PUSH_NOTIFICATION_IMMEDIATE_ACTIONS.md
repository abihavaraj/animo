# 🚨 IMMEDIATE ACTIONS - Push Notification Fix

## What You Discovered

You have **TWO different token formats** in your database:

### ✅ GOOD Tokens (Will Work):
```
ExponentPushToken[JIPCpMMxa6lUD1TanBBsKm]
```
These users WILL receive push notifications (after FCM setup)

### ❌ BAD Tokens (Won't Work):
```
f6cde98fa66feca3368b52a2e613970696f9461db63a5ab55acdc5237709439e
```
These users will NOT receive push notifications - these are old FCM tokens!

---

## Why This Happened

Your app previously stored raw FCM tokens. Now it generates Expo tokens, but some users still have the old format.

**Result:** Users with old tokens cannot receive push notifications even after you fix FCM!

---

## Action Plan (Do in Order)

### Step 1: Check How Many Users Are Affected

Run this in Supabase SQL Editor:

```sql
SELECT 
    COUNT(CASE WHEN push_token LIKE 'ExponentPushToken[%' THEN 1 END) as valid_expo_tokens,
    COUNT(CASE WHEN push_token NOT LIKE 'ExponentPushToken[%' THEN 1 END) as invalid_old_tokens,
    COUNT(CASE WHEN push_token IS NULL THEN 1 END) as no_token,
    COUNT(*) as total_users
FROM users;
```

This shows you exactly how many users have invalid tokens.

### Step 2: Upload FCM Credentials to Expo

**This is CRITICAL - nothing will work without this!**

#### Option A: Use Legacy Server Key (Try This First)

1. Go to: https://console.firebase.google.com/project/animostudio-3b804/settings/cloudmessaging
2. Look for "Cloud Messaging API (Legacy)" section
3. If you see a **Server key** (starts with `AAAA...`), copy it
4. Run:
   ```bash
   eas credentials
   # Select: Android → Push Notifications → Upload FCM Server Key
   # Paste the key
   ```

#### Option B: Use Service Account JSON (If No Server Key)

1. Go to: https://console.firebase.google.com/project/animostudio-3b804/settings/serviceaccounts/adminsdk
2. Click **"Generate new private key"**
3. Download the JSON file
4. Run:
   ```bash
   eas credentials
   # Select: Android → Push Notifications → Set up FCM v1
   # Upload the JSON file
   ```

### Step 3: Clean Up Invalid Tokens

Run this in Supabase SQL Editor:

```sql
-- Clear all old FCM tokens
UPDATE users
SET push_token = NULL
WHERE push_token IS NOT NULL
  AND push_token NOT LIKE 'ExponentPushToken[%';

-- Check results
SELECT 
    COUNT(CASE WHEN push_token LIKE 'ExponentPushToken[%' THEN 1 END) as valid_tokens,
    COUNT(CASE WHEN push_token IS NULL THEN 1 END) as will_reregister_on_login,
    COUNT(*) as total_users
FROM users;
```

**What this does:**
- Clears old invalid tokens
- When users login next time, app automatically generates new valid tokens
- Your code at `App.tsx` lines 116-147 handles this automatically!

### Step 4: Increment Version and Rebuild

Edit `app.json`:
```json
"android": {
  "versionCode": 28,  // Change from 27 to 28
  ...
}
```

Then build:
```bash
eas build --platform android --profile production
```

**Why rebuild?** The FCM credentials you uploaded in Step 2 need to be baked into the app.

### Step 5: Submit to Google Play Store

Upload your new APK/AAB to Google Play Store and release it.

### Step 6: Notify Users

After the app is live on Play Store, send an in-app notification:

```sql
-- Create notification for all users
INSERT INTO notifications (user_id, type, title, message, is_read, created_at)
SELECT 
    id,
    'system_update',
    'App Update Required',
    'Please update ANIMO to the latest version from Play Store to receive class reminders and notifications on your device.',
    false,
    NOW()
FROM users;
```

Then send push to tell users who still have valid tokens:

> "🔔 Important: Please logout and login again to enable push notifications for class reminders."

---

## Verification After All Steps

### Test 1: Check Database Tokens

```sql
-- All tokens should now be valid Expo format or NULL
SELECT 
    CASE 
        WHEN push_token LIKE 'ExponentPushToken[%' THEN '✅ Valid'
        WHEN push_token IS NULL THEN '⏳ Will register on login'
        ELSE '❌ Still invalid (ERROR!)'
    END as token_status,
    COUNT(*) as count
FROM users
GROUP BY token_status;
```

You should see:
- ✅ Valid: X users
- ⏳ Will register on login: Y users
- ❌ Still invalid: 0 users (should be ZERO!)

### Test 2: Manual Push Test

Get a token from database:
```sql
SELECT id, email, push_token 
FROM users 
WHERE push_token LIKE 'ExponentPushToken[%'
LIMIT 1;
```

Test it:
```powershell
$token = "ExponentPushToken[PASTE_ACTUAL_TOKEN]"

$body = @{
    to = $token
    title = "🎉 Test Notification"
    body = "Push notifications are now working!"
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
      "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
    }
  ]
}
```

If status = "ok", your push notifications are working! 🎉

---

## Timeline

| Step | Time Required | Can Do Now? |
|------|---------------|-------------|
| 1. Check affected users | 2 minutes | ✅ Yes |
| 2. Upload FCM credentials | 10 minutes | ✅ Yes |
| 3. Clean up invalid tokens | 5 minutes | ✅ Yes |
| 4. Rebuild app | 20-30 minutes | ✅ Yes |
| 5. Submit to Play Store | 1-3 days | ⏳ After build |
| 6. Users update app | Ongoing | ⏳ After release |

**Total time to fix: ~1 hour of work, then waiting for Play Store review**

---

## Expected Results

After all steps complete:

- ✅ New users: Get valid Expo tokens automatically on registration
- ✅ Existing users with valid tokens: Continue working
- ✅ Existing users with old tokens: Get new tokens on next login
- ✅ All push notifications: Will be delivered to Android devices
- ✅ In-app notifications: Continue working as before

---

## Files Reference

- `fix-invalid-push-tokens.sql` - Detailed diagnostic and cleanup script
- `ANDROID_PUSH_NOTIFICATION_FIX.md` - Complete fix guide
- `ENABLE_FCM_LEGACY_API.md` - FCM credential setup guide

---

## Need Help?

If something doesn't work:

1. Check FCM credentials are uploaded: `eas credentials`
2. Check token format in database (must be `ExponentPushToken[...]`)
3. Verify app version in Play Store matches rebuilt version
4. Test with the PowerShell command above

Good luck! 🚀

