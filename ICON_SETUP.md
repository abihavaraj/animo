# 🎨 ANIMO Pilates Studio - Icon Setup Guide

## 📱 App Icons Configured

Your ANIMO Pilates Studio app now has professionally designed icons set up for all platforms:

### ✅ **Main App Icons**
- **iOS Icon**: High-resolution 1024x1024 iTunesArtwork
- **Android Icon**: Adaptive icon with foreground and background
- **Web Favicon**: Optimized for web browsers
- **Splash Screen**: Launch screen icon

### 📁 **Icon Structure**

```
assets/images/
├── icon.png                    # Main app icon (1024x1024)
├── adaptive-icon.png            # Android adaptive icon foreground
├── favicon.png                  # Web favicon
├── splash-icon.png              # Splash screen icon
├── ios/
│   └── AppIcon.appiconset/      # Complete iOS icon set
│       ├── Contents.json        # iOS icon configuration
│       ├── Icon-App-20x20@1x.png
│       ├── Icon-App-20x20@2x.png
│       ├── Icon-App-20x20@3x.png
│       ├── Icon-App-29x29@1x.png
│       ├── Icon-App-29x29@2x.png
│       ├── Icon-App-29x29@3x.png
│       ├── Icon-App-40x40@1x.png
│       ├── Icon-App-40x40@2x.png
│       ├── Icon-App-40x40@3x.png
│       ├── Icon-App-60x60@2x.png
│       ├── Icon-App-60x60@3x.png
│       ├── Icon-App-76x76@1x.png
│       ├── Icon-App-76x76@2x.png
│       └── Icon-App-83.5x83.5@2x.png
└── android/
    ├── ic_launcher-web.png      # Android launcher icon
    ├── playstore-icon.png       # Google Play Store icon
    └── res/
        ├── mipmap-ldpi/         # Low density icons
        ├── mipmap-mdpi/         # Medium density icons
        ├── mipmap-hdpi/         # High density icons
        ├── mipmap-xhdpi/        # Extra high density icons
        ├── mipmap-xxhdpi/       # Extra extra high density icons
        ├── mipmap-xxxhdpi/      # Extra extra extra high density icons
        ├── mipmap-anydpi-v26/   # Adaptive icon configuration
        └── values/              # Color definitions
```

### 🎨 **Design Details**
- **Brand**: ANIMO Pilates Studio
- **Style**: Professional, clean design
- **Color Scheme**: Matches app theme (#F5F2B8 background)
- **Format**: All standard sizes and densities included

### ⚙️ **App Configuration**

The following has been configured in `app.json`:

```json
{
  "expo": {
    "icon": "./assets/images/icon.png",
    "ios": {
      "icon": "./assets/images/ios/AppIcon.appiconset/Icon-App-60x60@3x.png"
    },
    "android": {
      "icon": "./assets/images/android/ic_launcher-web.png",
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#F5F2B8"
      }
    },
    "web": {
      "favicon": "./assets/images/favicon.png"
    }
  }
}
```

### 🚀 **Platform Support**

#### **iOS**
- ✅ iPhone icons (all sizes)
- ✅ iPad icons (all sizes)
- ✅ App Store icon (1024x1024)
- ✅ Spotlight and Settings icons
- ✅ Notification icons

#### **Android**
- ✅ Adaptive icons (API 26+)
- ✅ Legacy icons (all densities)
- ✅ Round icons
- ✅ Play Store icon (512x512)
- ✅ Launcher icons

#### **Web**
- ✅ Favicon (256x256)
- ✅ Progressive Web App icon
- ✅ Browser tab icon

### 📱 **Testing Your Icons**

1. **Development**: Icons will appear in Expo Go
2. **iOS**: Test with EAS Build for production icons
3. **Android**: Test with EAS Build for adaptive icons
4. **Web**: Test locally with `expo start --web`

### 🔄 **Updating Icons**

To update icons in the future:

1. Replace files in `assets/images/`
2. Ensure same dimensions and formats
3. Update `app.json` if needed
4. Rebuild with EAS Build

### 📝 **Notes**

- Original icon source folder (`ICON/`) is excluded from builds via `.easignore`
- All icons are optimized for their respective platforms
- Adaptive icon background matches app theme color
- Icons follow platform-specific design guidelines

---

🎉 **Your ANIMO Pilates Studio app now has professional, platform-optimized icons ready for production!** 