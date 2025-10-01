# Expo Cloud Build - Android Icons Configuration

## ✅ What Was Done

### 1. **Copied All Android Resources**
All properly formatted Android icons from `assets/images/android/res/` have been copied to `android/app/src/main/res/`:

- ✅ **App Icons (Home Screen)**
  - `mipmap-*/ic_launcher.webp` - ANIMO logo (all densities)
  - `mipmap-*/ic_launcher_foreground.webp` - Foreground layer
  - `mipmap-*/ic_launcher_round.webp` - Round icon variant
  - `mipmap-anydpi-v26/ic_launcher.xml` - Adaptive icon configuration
  - Background color: #F4F1E0 (cream/beige)

- ✅ **Notification Icons**
  - `drawable-*/ic_stat_name.png` - Status bar notification (monochrome white)
  - `drawable-*/ic_action_name.png` - Notification action icons
  - All density folders: mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi

- ✅ **Configuration Files**
  - `values/ic_launcher_background.xml` - Background color
  - `values/colors.xml` - Color definitions
  - `drawable/ic_launcher_foreground.xml` - Vector foreground (backup)

### 2. **Updated app.json for EAS Builds**

**Android Section:**
```json
"android": {
  "package": "com.animo.pilatesstudio",
  "versionCode": 27,
  "jsEngine": "hermes",
  "playStoreIcon": "./assets/images/android/play_store_512.png",
  "googleServicesFile": "./google-services.json"
}
```

**Key Changes:**
- ❌ Removed `icon` field - prevents Expo from auto-generating icons
- ❌ Removed `adaptiveIcon` field - uses native resources instead
- ✅ Added `versionCode: 27` - matches iOS build number
- ✅ Native resources in `android/app/src/main/res/` take priority

**Notification Plugin:**
```json
"expo-notifications": {
  "color": "#F4F1E0",
  "icon": "./assets/images/notification-icon.png",
  "sounds": [],
  "androidMode": "default"
}
```

## 📦 EAS Cloud Build Commands

### Build APK (Testing)
```bash
eas build --platform android --profile production
```

### Build AAB (Google Play)
```bash
eas build --platform android --profile production-aab
```

### Preview Build (Internal Testing)
```bash
eas build --platform android --profile preview
```

## 🔍 How EAS Handles Icons

When building on expo.dev cloud:

1. **Native Resources Priority**: 
   - EAS includes all files from `android/app/src/main/res/`
   - Your custom icons will be used directly
   - No automatic generation since `icon`/`adaptiveIcon` are removed

2. **Notification Icons**:
   - Uses monochrome `ic_stat_name.png` from native res
   - System tints with color `#F4F1E0` from plugin config
   - Proper white silhouette format

3. **App Icons**:
   - Uses WebP files from `mipmap-*` folders
   - Adaptive icon with ANIMO logo foreground
   - Cream/beige background (#F4F1E0)

## ✅ Icon Verification Checklist

After building with EAS, verify:

### Home Screen Icon
- [ ] ANIMO logo displays correctly (not oversized)
- [ ] Background is cream/beige (#F4F1E0)
- [ ] Icon looks good in all launcher styles (round, square, squircle)
- [ ] No white borders or padding issues

### Notification Icon
- [ ] Displays as white silhouette (not gray square)
- [ ] Tinted with cream/beige color in status bar
- [ ] Clear and recognizable in notifications panel
- [ ] Works on both light and dark themes

### Play Store Icon
- [ ] 512x512 PNG displays correctly in store listing

## 📂 Files Modified

1. **app.json** - Removed auto-generation, configured for native resources
2. **android/app/src/main/res/** - All icon resources copied (53 files)
3. **eas.json** - Already configured for production builds

## 🚀 Next Steps

1. **Test Build Locally** (Optional):
   ```bash
   npx expo prebuild --clean
   cd android
   ./gradlew clean
   ./gradlew assembleRelease
   ```

2. **Build on EAS Cloud**:
   ```bash
   eas build --platform android --profile production
   ```

3. **Install and Test**:
   - Download APK from EAS dashboard
   - Install on physical Android device
   - Verify home icon and notification icons

## 🔧 Troubleshooting

### If Icons Don't Appear Correctly:

1. **Clear Expo cache**:
   ```bash
   npx expo start --clear
   ```

2. **Verify native resources**:
   ```bash
   ls android/app/src/main/res/mipmap-xxxhdpi/
   ls android/app/src/main/res/drawable-xxxhdpi/
   ```

3. **Check for conflicts**:
   - Make sure NO `icon` or `adaptiveIcon` in android section of app.json
   - Verify `ic_launcher.xml` references correct resources

### Common Issues:

- **Oversized icon**: Foreground image is too large, needs padding
- **Gray notification**: Using colored icon instead of monochrome
- **Missing icon**: Resource files not copied to res folders
- **Wrong icon**: Expo auto-generation enabled (check app.json)

## 📝 Important Notes

- ✅ All icons are now properly formatted for Android
- ✅ Notification icons are monochrome (required by Android)
- ✅ App icons use adaptive icon format with proper safe zones
- ✅ EAS builds will use native resources automatically
- ⚠️ Do NOT add `icon` or `adaptiveIcon` back to android section
- ⚠️ Do NOT replace monochrome notification icons with colored versions

## 🎨 Icon Specifications Met

| Type | Format | Size | Status |
|------|--------|------|--------|
| App Icon (MDPI) | WebP | 48x48dp | ✅ |
| App Icon (HDPI) | WebP | 72x72dp | ✅ |
| App Icon (XHDPI) | WebP | 96x96dp | ✅ |
| App Icon (XXHDPI) | WebP | 144x144dp | ✅ |
| App Icon (XXXHDPI) | WebP | 192x192dp | ✅ |
| Adaptive Foreground | WebP | 108x108dp | ✅ |
| Notification (MDPI) | PNG | 24x24dp | ✅ |
| Notification (HDPI) | PNG | 36x36dp | ✅ |
| Notification (XHDPI) | PNG | 48x48dp | ✅ |
| Notification (XXHDPI) | PNG | 72x72dp | ✅ |
| Notification (XXXHDPI) | PNG | 96x96dp | ✅ |
| Play Store | PNG | 512x512px | ✅ |

All icons are properly formatted and ready for Expo cloud builds! 🎉
