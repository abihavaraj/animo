# Enable FCM Legacy API for Expo Push Notifications

## Step 1: Enable Cloud Messaging API (Legacy)

The legacy API might be disabled. To enable it:

1. Go to Google Cloud Console: https://console.cloud.google.com/
2. Select your project: **animostudio-3b804**
3. Go to **APIs & Services** → **Library**
4. Search for "Firebase Cloud Messaging API"
5. Click **ENABLE** if it's not enabled

## Step 2: Get the Server Key

After enabling, get the Server Key:

1. Go back to Firebase Console: https://console.firebase.google.com/project/animostudio-3b804/settings/cloudmessaging
2. Scroll down to **Cloud Messaging API (Legacy)**
3. You should now see **Server key** (starts with `AAAA...`)
4. Copy this key

## Step 3: Upload to Expo

```bash
eas credentials
# Select: Android → Push Notifications → Upload FCM Server Key
# Paste the Server Key
```

---

# Alternative: Use FCM v1 API (If Legacy Not Available)

If the legacy API cannot be enabled, use the newer FCM v1 with service account JSON.

## Step 1: Create Service Account JSON

1. Go to Firebase Console: https://console.firebase.google.com/project/animostudio-3b804/settings/serviceaccounts/adminsdk
2. Click **Generate new private key**
3. Click **Generate key** button
4. **Download the JSON file** (keep it safe, it's sensitive!)

The JSON file will look like:
```json
{
  "type": "service_account",
  "project_id": "animostudio-3b804",
  "private_key_id": "xxxxx",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@animostudio-3b804.iam.gserviceaccount.com",
  ...
}
```

## Step 2: Upload Service Account JSON to Expo

```bash
eas credentials

# Select: Android
# Select: Push Notifications
# Select: Set up FCM v1
# Select: Upload JSON file
# Browse to your downloaded JSON file
```

## Step 3: Update Your App Configuration

The service account JSON approach is supported in Expo SDK 48+. Your app is already compatible.

---

# Which Option Should You Choose?

## ✅ Use Legacy API (Option 1) if:
- You can enable the legacy Cloud Messaging API
- It's simpler and faster
- **Recommended for now**

## ✅ Use FCM v1 API (Option 2) if:
- Legacy API cannot be enabled
- You want to use the newer, future-proof approach
- Legacy API gets deprecated

---

# Important Notes

⚠️ **DO NOT use P12 format** - That's for iOS APNs certificates, not Android FCM

⚠️ **Keep JSON files secure** - Service account JSON contains private keys. Never commit to git!

⚠️ **After uploading credentials:**
```bash
# Rebuild your app
eas build --platform android --profile production

# Version bump in app.json before building
# "versionCode": 28  (increment from current 27)
```

---

# Verification

After uploading credentials and rebuilding:

## Test Push Notification

```powershell
# Get a user's token from Supabase
r
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

If you get `status: "ok"`, your FCM is working! 🎉

---

# Troubleshooting

## Error: "InvalidRegistration"
- User needs to logout and login again to get new token

## Error: "MismatchSenderId"
- FCM configuration doesn't match your app
- Verify package name: `com.animo.pilatesstudio`
- Verify google-services.json is correct

## Error: "DeviceNotRegistered"
- Token is old/invalid
- User needs to reinstall app or logout/login

---

# Next Steps

1. **Try Option 1 first** (Legacy API with Server Key)
2. If that doesn't work, use **Option 2** (Service Account JSON)
3. Rebuild and upload to Google Play Store
4. Test with real users

Good luck! 🚀

