# 🔧 Shadow Style Migration Guide

## Issue
React Native Web has deprecated the `shadow*` style properties in favor of the standard CSS `boxShadow` property.

## Deprecated Properties
- `shadowColor`
- `shadowOffset`
- `shadowOpacity`  
- `shadowRadius`

## Migration Pattern

### ❌ Before (Deprecated)
```tsx
shadowColor: '#000',
shadowOffset: { width: 0, height: 1 },
shadowOpacity: 0.06,
shadowRadius: 2,
```

### ✅ After (Modern)
```tsx
boxShadow: '0 1px 2px rgba(0, 0, 0, 0.06)',
```

## Conversion Formula

For `boxShadow: 'offsetX offsetY blurRadius color'`:
- `offsetX` = `shadowOffset.width`
- `offsetY` = `shadowOffset.height`
- `blurRadius` = `shadowRadius`
- `color` = `shadowColor` with alpha from `shadowOpacity`

## Common Conversions

### Light Card Shadow
```tsx
// Before
shadowColor: '#000',
shadowOffset: { width: 0, height: 1 },
shadowOpacity: 0.06,
shadowRadius: 2,

// After
boxShadow: '0 1px 2px rgba(0, 0, 0, 0.06)',
```

### Accent Button Shadow
```tsx
// Before
shadowColor: Colors.light.accent,
shadowOffset: { width: 0, height: 1 },
shadowOpacity: 0.2,
shadowRadius: 2,

// After
boxShadow: '0 1px 2px rgba(183, 179, 49, 0.2)',
```

### Elevated Card Shadow
```tsx
// Before
shadowColor: '#000',
shadowOffset: { width: 0, height: 3 },
shadowOpacity: 0.3,
shadowRadius: 5,

// After
boxShadow: '0 3px 5px rgba(0, 0, 0, 0.3)',
```

## Status

### ✅ Fixed Files
- `src/screens/LoginScreen.tsx` - Login card and button shadows

### 🔄 Files Needing Migration
- `src/screens/RegisterScreen.tsx`
- `src/screens/ProfileScreen.tsx`
- `src/screens/HomeScreen.tsx`
- `src/screens/instructor/ScheduleOverview.tsx`
- `src/screens/instructor/InstructorDashboard.tsx`
- `src/screens/instructor/ClassManagement.tsx`
- `src/screens/client/PaymentHistory.tsx`
- `src/screens/client/NotificationsView.tsx`
- `src/screens/client/ClientProfile.tsx`
- `src/screens/client/ClientDashboard.tsx`
- `src/screens/client/ClassesView.tsx`
- And more...

## Migration Script

You can use this regex find/replace pattern to help with migration:

**Find:**
```regex
shadowColor: (['"][^'"]*['"]|\w+),\s*shadowOffset: \{ width: (\d+), height: (\d+) \},\s*shadowOpacity: ([\d.]+),\s*shadowRadius: (\d+),?
```

**Replace:**
```
boxShadow: '$2px $3px $5px rgba(0, 0, 0, $4)',
```

## Note
Keep `elevation` property for React Native compatibility. The `boxShadow` property is primarily for web.

## Next Steps
1. Run the migration script or manually update files
2. Test on web to ensure shadows render correctly
3. Remove this warning from console
4. Consider creating a shadow utility function for consistency 