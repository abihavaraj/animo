# 📱 Android Notification Icon Configuration Guide

## Overview
This guide explains Android notification icon requirements, sizes, and where icon file locations are configured in the ANIMO Pilates Studio app.

---

## 🎯 Icon Location Configuration

### 1. **app.json** (Expo Configuration)
The notification icon is initially configured in `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "color": "#F4F1E0",
          "defaultChannel": "animo-notifications",
          "icon": "./assets/images/notification-icon.png",
          "sounds": [],
          "mode": "production",
          "androidMode": "default",
          "androidCollapsedTitle": "ANIMO Notification"
        }
      ]
    ]
  }
}
```

**Key Properties:**
- `icon`: Points to the source notification icon file
- `color`: The tint color applied to the notification icon (#F4F1E0 - light beige)

### 2. **AndroidManifest.xml** (Native Android Configuration)
The final configuration is in `android/app/src/main/AndroidManifest.xml`:

```xml
<application>
  <!-- Firebase Messaging default notification icon -->
  <meta-data 
    android:name="com.google.firebase.messaging.default_notification_icon" 
    android:resource="@drawable/notification_icon"/>
  
  <!-- Firebase Messaging default notification color -->
  <meta-data 
    android:name="com.google.firebase.messaging.default_notification_color" 
    android:resource="@color/notification_icon_color"/>
  
  <!-- Expo Notifications default icon -->
  <meta-data 
    android:name="expo.modules.notifications.default_notification_icon" 
    android:resource="@drawable/notification_icon"/>
  
  <!-- Expo Notifications default color -->
  <meta-data 
    android:name="expo.modules.notifications.default_notification_color" 
    android:resource="@color/notification_icon_color"/>
</application>
```

**Key Resources:**
- `@drawable/notification_icon`: References the notification icon drawable
- `@color/notification_icon_color`: References the color defined in colors.xml

### 3. **colors.xml** (Color Definition)
The notification icon color is defined in `android/app/src/main/res/values/colors.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
  <color name="notification_icon_color">#F4F1E0</color>
</resources>
```

---

## 📐 Required Icon Sizes

Android requires notification icons in multiple densities. All icons must be **monochrome silhouettes** (solid black on transparent background).

### Icon Size Chart

| Density | Folder | Size (px) | Scale Factor |
|---------|--------|-----------|--------------|
| **mdpi** | `drawable-mdpi/` | 24×24 | 1x (baseline) |
| **hdpi** | `drawable-hdpi/` | 36×36 | 1.5x |
| **xhdpi** | `drawable-xhdpi/` | 48×48 | 2x |
| **xxhdpi** | `drawable-xxhdpi/` | 72×72 | 3x |
| **xxxhdpi** | `drawable-xxxhdpi/` | 96×96 | 4x |
| **default** | `drawable/` | 24×24 | Fallback |

### File Locations
All notification icon files are located in:
```
android/app/src/main/res/
├── drawable/
│   └── notification_icon.png          (24×24px)
├── drawable-mdpi/
│   └── notification_icon.png          (24×24px)
├── drawable-hdpi/
│   └── notification_icon.png          (36×36px)
├── drawable-xhdpi/
│   └── notification_icon.png          (48×48px)
├── drawable-xxhdpi/
│   └── notification_icon.png          (72×72px)
└── drawable-xxxhdpi/
    └── notification_icon.png          (96×96px)
```

---

## 🎨 Design Requirements

### ✅ Must Have
- **Monochrome**: Pure black (#000000) on transparent background
- **Simple shape**: Easy to recognize at small sizes
- **High contrast**: No gradients, shadows, or gray tones
- **PNG format**: 32-bit PNG with alpha channel
- **Square canvas**: Even though icon is small, use square canvas

### ❌ Avoid
- ❌ Colored icons (Android will make them white/tinted)
- ❌ Complex details (won't be visible at 24×24px)
- ❌ Text or small letters (hard to read)
- ❌ Gradients or shadows (won't render well)
- ❌ Non-transparent backgrounds

### Visual Example
```
✅ GOOD:                    ❌ BAD:
┌──────────┐               ┌──────────┐
│          │               │   ANIMO  │
│    ●●    │               │  ╭─────╮ │
│   ●  ●   │               │  │ 🏃‍♀️ │ │
│    ╰╯    │               │  ╰─────╯ │
│          │               │          │
└──────────┘               └──────────┘
Simple silhouette          Too complex/colored
```

---

## 🔄 How Icons Flow Through the System

### Development to Production Flow

1. **Source File**
   ```
   assets/images/notification-icon.png
   ```
   - Designer creates the icon
   - Must be monochrome, ideally at highest density (96×96px)

2. **Expo Prebuild Process**
   ```
   npx expo prebuild --clean
   ```
   - Expo reads `app.json` configuration
   - Generates density-specific versions
   - Places them in `android/app/src/main/res/drawable-*/`

3. **Build Process**
   ```
   eas build --platform android --profile production
   ```
   - Android build system packages icons
   - Includes all density versions in APK/AAB

4. **Runtime Selection**
   - Android OS chooses appropriate density based on device screen
   - Applies color tint from `notification_icon_color`
   - Displays in notification tray

---

## 🛠️ How to Update Notification Icons

### Method 1: Using Expo (Recommended)

1. **Create/Update Source Icon**
   ```
   assets/images/notification-icon.png
   ```
   - Design a 96×96px monochrome PNG
   - Pure black silhouette on transparent background

2. **Verify app.json Configuration**
   ```json
   {
     "expo": {
       "plugins": [
         ["expo-notifications", {
           "icon": "./assets/images/notification-icon.png"
         }]
       ]
     }
   }
   ```

3. **Regenerate Android Project**
   ```bash
   npx expo prebuild --clean --platform android
   ```

4. **Build the App**
   ```bash
   eas build --platform android --profile production
   ```

### Method 2: Manual Update (Advanced)

1. **Generate Icons**
   - Use Android Studio Asset Studio, OR
   - Create icons manually at each density

2. **Place Files**
   - Copy icons to each `drawable-*/` folder
   - Ensure all named `notification_icon.png`

3. **Verify AndroidManifest.xml**
   - Check meta-data tags reference `@drawable/notification_icon`

4. **Build the App**
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

---

## 🧪 Testing Your Icons

### 1. **Local Testing**
```bash
# Send a test notification
node api/test-notifications.js
```

### 2. **Check Icon Appearance**
- Pull down notification shade
- Look for ANIMO notifications
- Icon should appear as colored silhouette (using your tint color)

### 3. **What to Look For**
✅ **Good Signs:**
- Icon is clearly visible
- Color matches your brand (#F4F1E0)
- Shape is recognizable

❌ **Problems:**
- White square (icon not found or wrong format)
- Unclear shape (too complex)
- Wrong color (color resource issue)

---

## 🔍 Troubleshooting

### Problem: White Square Instead of Icon
**Causes:**
- Icon file missing from drawable folders
- Wrong file name (must be `notification_icon.png`)
- Icon not in proper format (needs transparency)

**Solution:**
1. Verify files exist in all drawable folders
2. Check file names are exactly `notification_icon.png`
3. Run `npx expo prebuild --clean`

### Problem: Icon Not Displaying Correctly
**Causes:**
- Icon is colored (not monochrome)
- Icon has complex details
- PNG doesn't have alpha channel

**Solution:**
1. Create pure black silhouette on transparent background
2. Simplify the design
3. Save as 32-bit PNG with alpha channel

### Problem: Wrong Color
**Causes:**
- `colors.xml` not updated
- AndroidManifest.xml pointing to wrong color resource

**Solution:**
1. Check `android/app/src/main/res/values/colors.xml`:
   ```xml
   <color name="notification_icon_color">#F4F1E0</color>
   ```
2. Verify AndroidManifest.xml references this color
3. Rebuild the app

### Problem: Icons Different Sizes on Different Devices
**Causes:**
- Missing density-specific versions
- Using same size for all densities

**Solution:**
1. Ensure all densities are present (mdpi through xxxhdpi)
2. Use correct sizes for each density
3. Run `npx expo prebuild --clean` to regenerate

---

## 📚 Related Files

### Configuration Files
- `app.json` - Expo notification plugin configuration
- `android/app/src/main/AndroidManifest.xml` - Native Android config
- `android/app/src/main/res/values/colors.xml` - Color definitions

### Icon Files
- `assets/images/notification-icon.png` - Source icon file
- `android/app/src/main/res/drawable-*/notification_icon.png` - Generated icons

### Documentation
- `PUSH_NOTIFICATION_IMMEDIATE_ACTIONS.md` - Notification setup guide
- `NOTIFICATION_TESTING_GUIDE.md` - Testing procedures
- `create-notification-icons.md` - Icon creation guide

---

## 🎓 Best Practices

1. **Design Once, Scale Properly**
   - Create icon at highest density (96×96px)
   - Let build tools generate smaller versions
   - Or manually scale down for each density

2. **Keep It Simple**
   - Icon appears very small on device
   - Simple shapes work best
   - Avoid text and fine details

3. **Test on Real Devices**
   - Different Android versions may render differently
   - Test on various screen densities
   - Check both light and dark system themes

4. **Version Control**
   - Keep source PSD/AI files
   - Commit all density versions
   - Document design decisions

5. **Consistency**
   - Match your app's branding
   - Use same color as app theme
   - Keep style consistent with app icon

---

## ✅ Quick Checklist

Before deploying notifications:

- [ ] Source icon is monochrome (black on transparent)
- [ ] All 6 density versions exist in drawable folders
- [ ] Files are named exactly `notification_icon.png`
- [ ] `app.json` points to correct source icon
- [ ] `colors.xml` has correct notification color
- [ ] AndroidManifest.xml has correct meta-data tags
- [ ] Tested on at least one physical Android device
- [ ] Icon is recognizable and matches brand

---

## 📖 Additional Resources

- [Android Notification Icon Guidelines](https://developer.android.com/develop/ui/views/notifications)
- [Material Design - Notification Icons](https://material.io/design/platform-guidance/android-notifications.html)
- [Expo Notifications Documentation](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Firebase Cloud Messaging - Notification Appearance](https://firebase.google.com/docs/cloud-messaging/android/send-image)

---

**Last Updated:** October 3, 2025  
**App Version:** 1.0.8  
**Project:** ANIMO Pilates Studio

