# Language Selection Testing Guide

## 🔧 Fixes Applied

I've fixed several issues with the language selector:

1. **✅ Proper State Management**: Added proper language state tracking
2. **✅ Event Listeners**: Listen to i18n language change events  
3. **✅ Better Error Handling**: Added console logging for debugging
4. **✅ Visual Feedback**: Loading states and disabled buttons during changes
5. **✅ Force Re-render**: Ensure UI updates when language changes

## 🧪 How to Test Language Switching

### Step 1: Check Console Logs
Open your development console (Metro bundler logs or browser console) to see debug information.

### Step 2: Test in Admin Settings
1. **Login as Admin** (admin@admin.com / admin123)
2. Go to **Settings** → **Studio Settings** 
3. Scroll down to **Language Preferences** section
4. Click on **Albanian (Shqip)** radio button
5. **Watch console logs** - you should see:
   ```
   handleInlineLanguageChange called with: sq
   Changing language to: sq
   Language changed successfully to: sq
   i18n language changed to: sq
   Language change completed for: sq
   ```

### Step 3: Test in Client Profile  
1. **Login as Client** (jennifer@example.com / client123)
2. Go to **Profile** tab
3. Scroll down to **Language Settings** section
4. Tap the **Language Button** (should show current language)
5. Select **Shqip** from the modal
6. Tap **Save**

### Step 4: Verify Translation Changes
After switching to Albanian, check these screens:
- **Login Screen**: "Welcome Back" → "Mirë se erdhët përsëri"
- **Profile Screen**: "Language Settings" → "Cilësimet e gjuhës"
- **Settings Screen**: "Studio Settings" → "Cilësimet e studios"

## 🐛 Troubleshooting

### Issue: Radio Button Not Changing
**Solution**: 
- Check console logs for errors
- Ensure AsyncStorage permissions are working
- Try restarting the Metro bundler

### Issue: Text Not Translating
**Possible Causes**:
1. Component not using `useTranslation()` hook
2. Translation key missing in `sq.json`
3. Component not re-rendering after language change

**Fix**: The new code forces re-renders using i18n event listeners.

### Issue: Language Not Persisting
**Check**: 
- AsyncStorage is working
- No errors in i18n initialization
- Language detection function is called

## 🔍 Debug Commands

### Check Current Language in Console:
```javascript
import { getCurrentLanguage } from './src/i18n';
console.log('Current language:', getCurrentLanguage());
```

### Manually Change Language:
```javascript
import { changeLanguage } from './src/i18n';
changeLanguage('sq').then(success => console.log('Changed:', success));
```

### Check Translation Value:
```javascript
import { useTranslation } from 'react-i18next';
const { t } = useTranslation();
console.log('Translation:', t('common.save')); // Should show "Ruaj" in Albanian
```

## ✅ Expected Behavior

### Working Language Switch:
1. **Click Albanian** → Radio button selects immediately
2. **Console logs** → Shows language change process
3. **UI updates** → Translated text appears instantly  
4. **Persistence** → Language saved for next app launch
5. **All screens** → Show Albanian text consistently

### Translation Examples:
| English | Albanian (Shqip) |
|---------|------------------|
| Save | Ruaj |
| Cancel | Anulo |
| Loading... | Duke u ngarkuar... |
| Settings | Cilësimet |
| Profile | Profili |
| Language Settings | Cilësimet e gjuhës |

## 🚀 If Still Not Working

1. **Restart Metro bundler**: 
   ```bash
   npx expo start --clear
   ```

2. **Clear AsyncStorage** (for testing):
   ```javascript
   import AsyncStorage from '@react-native-async-storage/async-storage';
   AsyncStorage.removeItem('app_language');
   ```

3. **Force refresh** the app completely

4. **Check dependencies** are properly installed:
   ```bash
   npm list react-i18next i18next
   ```

## 📱 Platform-Specific Notes

### Web:
- Language changes should be instant
- Check browser console for logs
- localStorage used instead of AsyncStorage

### Mobile (iOS/Android):
- May have slight delay for AsyncStorage
- Check Metro bundler logs
- Ensure proper permissions

The improved code should now handle language switching properly with better state management and user feedback! 🎉
