# Production Build Guide for ANIMO Pilates Studio App

## ✅ Pre-Build Checklist Complete

- [x] All console.log statements disabled in production
- [x] Debug/test components removed
- [x] App name set to "ANIMO"
- [x] Custom app icon configured
- [x] Production logger enabled (auto-disables logs in production)

## 🚀 Build Commands

### Android (Play Store - AAB)
```bash
npx eas build --platform android --profile production
```

### iOS (App Store - IPA)
```bash
npx eas build --platform ios --profile production
```

### Both Platforms
```bash
npx eas build --platform all --profile production
```

## 📦 Build Profiles

Check your `eas.json` for build configurations. Typical production profile:

```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "app-bundle"
      },
      "ios": {
        "bundler": "metro"
      }
    }
  }
}
```

## 📱 After Build Completes

### Android (Google Play Console)
1. Download the `.aab` file from EAS
2. Go to Google Play Console → Your App → Release → Production
3. Create new release
4. Upload the AAB file
5. Fill in release notes
6. Submit for review

### iOS (App Store Connect)
1. Download the `.ipa` file from EAS (or let EAS upload directly)
2. Go to App Store Connect → Your App → TestFlight or App Store
3. Select the build
4. Fill in app information
5. Submit for review

## 🔍 Monitor Build Progress

- EAS Dashboard: https://expo.dev
- Build logs will show in terminal
- You'll receive email when build completes

## ⚡ Performance Notes

**Current Issue Addressed:**
- Booking was taking 7-8 seconds (too long)
- Hundreds of console.log statements were slowing down the app
- **Solution**: All logs now disabled in production builds

**Expected Performance Improvement:**
- Booking should now complete in 2-3 seconds
- Dashboard refresh should be under 1 second
- Overall app will be significantly faster

## 🛠️ Troubleshooting

If build fails:
1. Check EAS build logs for specific errors
2. Ensure all dependencies are properly installed
3. Verify `app.json` configuration is correct
4. Check that signing credentials are set up (EAS handles this automatically)

## 📊 Build Status

Current build initiated: Cloud build in progress
Expected completion: 10-15 minutes
