# Google Play Store Submission Fix

## Issue
The Google Service Account is missing the necessary permissions to submit the app to Google Play Store.

## Solution Steps

### 1. Update Google Play Console Permissions

You need to grant your service account the necessary permissions in the Google Play Console:

1. **Go to Google Play Console**: https://play.google.com/console
2. **Navigate to Setup > API access**
3. **Find your service account**: `animo-pilates-studio@animo-pilates-studio.iam.gserviceaccount.com`
4. **Grant these permissions**:
   - **App Bundle Creator**: Allows creating app bundles
   - **App Release Manager**: Allows managing releases
   - **Play Console API Access**: Allows API access

### 2. Verify Service Account Setup

Your service account should have these roles in Google Cloud Console:
- **Service Account User**
- **Service Account Token Creator**
- **Play Console API Access**

### 3. Alternative: Use EAS Credentials

If you prefer to use EAS-managed credentials instead of a local service account file:

```bash
# Remove the serviceAccountKeyPath from eas.json and use:
eas credentials
```

### 4. Test Submission

After fixing permissions, try submitting again:

```bash
eas submit --platform android --profile production-aab
```

### 5. Common Permission Issues

- **Missing App Bundle Creator**: Service account can't create AAB files
- **Missing Release Manager**: Service account can't manage releases
- **API Access Disabled**: Service account can't use Play Console APIs

### 6. Verification

Check if permissions are working:
```bash
# Verify EAS credentials
eas credentials:list

# Check service account status
eas credentials:view
```

## Current Configuration

Your `eas.json` now includes:
- `production-aab` submit profile
- Internal track configuration
- Service account key path (if using local file)

## Next Steps

1. Fix Google Play Console permissions
2. Test submission with `eas submit --platform android --profile production-aab`
3. If using local service account file, ensure `google-service-account.json` exists in project root
4. Consider using EAS-managed credentials for simplicity

## Support

If issues persist:
- Check EAS documentation: https://docs.expo.dev/eas-update/submitting/
- Google Play Console API documentation
- EAS support channels
