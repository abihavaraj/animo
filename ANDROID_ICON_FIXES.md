# Android Icon Configuration Fixes

## Issues Found and Resolved

### 1. ❌ **App Icon Configuration Conflict**
**Problem:** 
- `app.json` had conflicting icon configurations
- Lines 67, 69-72 were using Expo's auto-generation (`icon` and `adaptiveIcon`)
- This conflicted with native Android icons in `mipmap-*` folders
- Result: Oversized home app icon

**Solution:**
- ✅ Removed `"icon": "./assets/images/icon.png"` from android section
- ✅ Removed entire `adaptiveIcon` object from android section
- ✅ Now using ONLY native Android resources from `mipmap-*` folders

### 2. ❌ **Adaptive Icon Using Placeholder**
**Problem:**
- `ic_launcher.xml` and `ic_launcher_round.xml` referenced `@drawable/ic_launcher_foreground_fixed`
- This XML file contained a placeholder circle, not the actual ANIMO logo
- Result: Generic circle icon instead of ANIMO branding

**Solution:**
- ✅ Updated both XML files to use `@mipmap/ic_launcher_foreground`
- ✅ This references the proper ANIMO logo WebP files in all density folders
- ✅ Background color remains #F4F1E0 (cream/beige)

### 3. ❌ **Notification Icon Wrong Format**
**Problem:**
- Notification icons in `drawable-*` folders were colored versions of the ANIMO logo
- Android notification icons MUST be monochrome (white silhouette on transparent)
- Colored icons appear as gray squares or distorted
- Result: "Very bad" notification icon appearance

**Solution:**
- ✅ Replaced all notification icons across all density folders with proper monochrome version
- ✅ Used `assets/images/notification-icon.png` (white silhouette)
- ✅ Copied to: drawable, drawable-hdpi, drawable-mdpi, drawable-xhdpi, drawable-xxhdpi, drawable-xxxhdpi

### 4. ❌ **Notification Icon Path Error in app.json**
**Problem:**
- Line 101 had `"androidIcon": "./android/app/src/main/res/drawable/notification_icon.png"`
- This path doesn't exist and causes Expo to try overriding native icons

**Solution:**
- ✅ Removed the `androidIcon` line from app.json
- ✅ Now using native Android notification icons only

## Files Modified

### `app.json`
```json
// BEFORE:
"android": {
  "icon": "./assets/images/icon.png",
  "adaptiveIcon": {
    "foregroundImage": "./assets/images/adaptive-icon.png",
    "backgroundColor": "#F4F1E0"
  }
}

// AFTER:
"android": {
  // Only native icons, no Expo auto-generation
}
```

### `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml`
```xml
<!-- BEFORE: -->
<foreground android:drawable="@drawable/ic_launcher_foreground_fixed"/>

<!-- AFTER: -->
<foreground android:drawable="@mipmap/ic_launcher_foreground"/>
```

### Notification Icons
- Replaced colored icons with monochrome in all 6 density folders

## Current Icon Configuration

### App Icons (Home Screen)
- **Source**: Native Android WebP files in `mipmap-*/ic_launcher_foreground.webp`
- **Background**: #F4F1E0 (cream/beige) from `values/ic_launcher_background.xml`
- **Format**: Adaptive icon (properly sized for all Android versions)
- **Logo**: ANIMO Pilates Studio logo

### Notification Icons
- **Source**: Native Android PNG files in `drawable-*/notification_icon.png`
- **Format**: Monochrome white silhouette on transparent background
- **Tinting**: System applies #F4F1E0 color automatically (from app.json line 98)

## Testing Required

After building a new APK, verify:
1. ✅ Home screen app icon displays ANIMO logo correctly (not oversized)
2. ✅ Icon looks good on different Android launchers
3. ✅ Notification icon displays as proper white silhouette (not gray square)
4. ✅ Notification icon tints correctly with the cream/beige color

## Build Commands

```powershell
# Clean build (recommended after icon changes)
cd android
.\gradlew clean
cd ..

# Build APK
npx expo run:android

# Or build production APK
eas build --platform android --profile production
```

## Notes

- **DO NOT** add back `icon` or `adaptiveIcon` to the android section of app.json
- **DO NOT** replace the monochrome notification icons with colored versions
- Android notification icons MUST be monochrome silhouettes only
- The WebP foreground icons in mipmap folders are the source of truth for app icons
