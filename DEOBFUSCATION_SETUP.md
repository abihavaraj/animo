# Deobfuscation Setup Guide

## What This Fixes

The warning "There is no deobfuscation file associated with this App Bundle" appears when you're using code obfuscation (R8/ProGuard) but haven't provided the corresponding mapping files to Google Play Console.

## Benefits of Proper Deobfuscation Setup

1. **Better Crash Analysis**: Stack traces will show readable class and method names instead of obfuscated ones
2. **Easier Debugging**: Developers can quickly identify which part of the code caused issues
3. **Reduced App Size**: R8/ProGuard optimization can reduce APK size by 10-30%
4. **Security**: Code obfuscation makes reverse engineering more difficult

## What We've Configured

### 1. ProGuard/R8 Configuration
- Enabled ProGuard in `gradle.properties`
- Added comprehensive ProGuard rules in `proguard-rules.pro`
- Configured EAS build to use ProGuard

### 2. Deobfuscation File Generation
The following files will be generated during build:
- `mapping.txt` - Maps obfuscated names to original names
- `seeds.txt` - Lists classes that weren't obfuscated
- `configuration.txt` - Shows ProGuard configuration used

### 3. EAS Build Configuration
- Added ProGuard environment variables
- Configured proper gradle command for release builds

## How to Use Deobfuscation Files

### During Development
1. **Locate mapping files**: After building, find them in `android/app/build/outputs/mapping/release/`
2. **Store safely**: Keep these files secure - they're needed to deobfuscate crash reports
3. **Version control**: Consider storing mapping files with your release tags

### For Google Play Console
1. **Upload mapping files**: When uploading a new APK/AAB, also upload the corresponding `mapping.txt`
2. **Version matching**: Ensure mapping file matches the exact build version
3. **Automatic upload**: Consider using EAS submit which can handle this automatically

## Testing the Setup

### 1. Build a New Release
```bash
eas build --platform android --profile production-aab
```

### 2. Verify Files Generated
Check that these files exist in your build artifacts:
- `mapping.txt`
- `seeds.txt` 
- `configuration.txt`

### 3. Submit to Play Console
```bash
eas submit --platform android --profile production-aab
```

## Troubleshooting

### Common Issues

1. **Mapping files not generated**
   - Check that ProGuard is enabled in `gradle.properties`
   - Verify ProGuard rules are correct
   - Ensure you're building in release mode

2. **Build fails with ProGuard**
   - Check ProGuard rules for syntax errors
   - Verify all required classes are properly kept
   - Check for conflicting dependencies

3. **Deobfuscation not working**
   - Ensure mapping file version matches APK version exactly
   - Check that mapping file is properly uploaded to Play Console
   - Verify crash reports are from the correct app version

### ProGuard Rule Best Practices

1. **Keep essential classes**: React Native, Expo, and your app's main classes
2. **Test thoroughly**: Always test ProGuard builds on real devices
3. **Monitor crashes**: Use crash reporting tools to verify deobfuscation works
4. **Update rules**: Add new keep rules as you add new libraries

## Next Steps

1. **Build and test**: Create a new build with ProGuard enabled
2. **Verify files**: Check that deobfuscation files are generated
3. **Submit**: Upload new AAB with mapping files to Play Console
4. **Monitor**: Watch for improved crash report readability

## Resources

- [ProGuard Manual](https://www.guardsquare.com/manual/home)
- [Android R8 Documentation](https://developer.android.com/studio/build/shrink-code)
- [EAS Build Documentation](https://docs.expo.dev/eas-update/)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer/)
