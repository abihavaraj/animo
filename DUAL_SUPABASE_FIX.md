# Dual Supabase Instance Fix

## Problem

When deploying to Vercel with two Supabase projects (Pilates Studio + Bar Portal), the following issues occurred:

1. **Multiple GoTrueClient Instances Warning**: Both Supabase clients were using the same localStorage storage keys, causing conflicts
2. **Data Loading Issues**: Required multiple refreshes to load data because auth sessions were overwriting each other
3. **406 Not Acceptable Errors**: Missing proper headers in API requests
4. **WebSocket Connection Failures**: Conflicts between the two Supabase clients

## Root Cause

Both Supabase clients were using the **default storage key** for localStorage, which caused:
- Auth sessions to overwrite each other
- Concurrent access conflicts
- Unstable authentication state
- Data fetching failures

## Solution Implemented

### 1. Unique Storage Keys

Added unique `storageKey` to each Supabase client configuration:

**Main Pilates Studio Client** (`src/config/supabase.config.ts`):
```typescript
auth: {
  storageKey: 'animo-pilates-studio-auth',
  // ... other config
}
```

**Bar Portal Client** (`src/config/supabase.bar.config.ts`):
```typescript
auth: {
  storageKey: 'animo-bar-portal-auth',
  // ... other config
}
```

### 2. Proper HTTP Headers

Added Accept and Content-Type headers to both clients to prevent 406 errors:

```typescript
global: {
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    // ... other headers
  }
}
```

### 3. Vercel Environment Variables

Updated `vercel.json` to include Bar Supabase environment variables:

```json
{
  "env": {
    "EXPO_PUBLIC_BAR_SUPABASE_URL": "https://grfyzitojijoptyqhujs.supabase.co",
    "EXPO_PUBLIC_BAR_SUPABASE_ANON_KEY": "..."
  }
}
```

## Files Modified

1. ✅ `src/config/supabase.config.ts` - Added unique storage key and headers
2. ✅ `src/config/supabase.bar.config.ts` - Added unique storage key and headers
3. ✅ `vercel.json` - Added Bar Supabase environment variables

## Deployment Instructions

To deploy the fix to Vercel:

```bash
vercel --prod
```

## Expected Results

After deployment:
- ✅ No more "Multiple GoTrueClient instances" warnings
- ✅ Data loads immediately without requiring refreshes
- ✅ No more 406 errors from Supabase API
- ✅ Stable WebSocket connections for both projects
- ✅ Proper auth session isolation between projects

## Technical Details

### Storage Key Isolation

Each Supabase client now uses a unique localStorage key:
- **Pilates Studio**: `sb-byhqueksdwlbiwodpbbd-auth-token` → `animo-pilates-studio-auth`
- **Bar Portal**: `sb-grfyzitojijoptyqhujs-auth-token` → `animo-bar-portal-auth`

This prevents the clients from:
- Reading each other's sessions
- Overwriting each other's auth tokens
- Causing concurrent access conflicts

### Headers Configuration

Both clients now explicitly set:
- `Accept: application/json` - Tells Supabase we accept JSON responses
- `Content-Type: application/json` - Tells Supabase we're sending JSON data

This prevents 406 (Not Acceptable) errors from the Supabase REST API.

## Verification Steps

After deployment, verify the fix by:

1. **Check Browser Console**: Should see no "Multiple GoTrueClient instances" warnings
2. **Test Data Loading**: Data should load immediately without refreshes
3. **Check localStorage**: Should see two separate auth keys in DevTools → Application → Local Storage
4. **Monitor Network Tab**: Should see no 406 errors
5. **Test Both Portals**: Both Pilates Studio and Bar Portal should work independently

## Additional Notes

- Each Supabase project maintains its own isolated auth state
- Users can be logged into both systems simultaneously
- No data sharing occurs between the two Supabase projects
- Both projects can use Realtime features without conflicts

