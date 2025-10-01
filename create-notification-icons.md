# Android Notification Icon Requirements

## Current Issue
Your notification icons don't look right because Android requires **monochrome (black/white silhouette)** icons for notifications.

## What You Need
Create simple, monochrome notification icons in these sizes:

- **24x24px** (mdpi) - Base size
- **36x36px** (hdpi) - 1.5x density  
- **48x48px** (xhdpi) - 2x density
- **72x72px** (xxhdpi) - 3x density
- **96x96px** (xxxhdpi) - 4x density

## Design Guidelines
1. **Solid black silhouette** on transparent background
2. **Simple shape** - avoid fine details
3. **High contrast** - pure black (#000000), not gray
4. **Recognizable** - should represent your app (pilates/yoga theme)

## Quick Fix Options

### Option 1: Use a Simple Shape
Create a simple pilates/yoga related icon:
- Yoga pose silhouette
- Circle with "A" for ANIMO
- Simple geometric shape

### Option 2: Convert Existing Icon
Take your current app icon and:
1. Convert to black silhouette
2. Remove colors/details
3. Keep only the main shape

### Option 3: Use Android Studio Icon Generator
1. Open Android Studio
2. Right-click res/drawable folder
3. New → Image Asset
4. Choose "Notification Icons"
5. Upload your icon and it will generate all sizes

## Files to Replace
Replace these files with monochrome versions:
- `android/app/src/main/res/drawable/notification_icon.png`
- `android/app/src/main/res/drawable-hdpi/notification_icon.png`
- `android/app/src/main/res/drawable-mdpi/notification_icon.png`
- `android/app/src/main/res/drawable-xhdpi/notification_icon.png`
- `android/app/src/main/res/drawable-xxhdpi/notification_icon.png`
- `android/app/src/main/res/drawable-xxxhdpi/notification_icon.png`

## Test After Changes
1. Rebuild the app
2. Send a test notification
3. Check how it looks in the notification panel

