# Push Token Storage System - Complete Explanation

## The Two Storage Locations

Your app stores push tokens in **TWO places**:

### 1. `users.push_token` (Column in users table)
- **Original/Legacy system**
- One token per user
- **This was working for iPhone before**
- Simple and straightforward

### 2. `push_tokens` (Separate table)
- **New system** (added later for multi-device support)
- Multiple tokens per user
- Allows users to receive notifications on multiple devices
- Example: Same user on iPhone + iPad, or work phone + personal phone

---

## What The App Is Actually Doing

### When User LOGS IN (Token Registration):

**Location:** `src/services/pushNotificationService.ts` lines 230-321

```javascript
// 1. ALWAYS saves to users.push_token (legacy)
await supabase
  .from('users')
  .update({ push_token: token })
  .eq('id', user.id);

// 2. ALSO tries to save to push_tokens table (multi-device)
await supabase
  .from('push_tokens')
  .upsert({
    user_id: user.id,
    token: token,
    device_type: Platform.OS,  // 'ios' or 'android'
    device_name: 'iPhone 14',
    is_active: true
  });
```

**Result:** Token is saved to BOTH places ✅

---

### When Sending PUSH NOTIFICATION:

**Location:** `src/services/notificationService.ts` lines 722-852

```javascript
// STEP 1: Try to get tokens from push_tokens table (NEW system)
const { data: activeTokens } = await supabase
  .from('push_tokens')
  .select('token, device_type, device_name')
  .eq('user_id', userId)
  .eq('is_active', true);

// STEP 2: If push_tokens is empty OR has error, FALLBACK to users.push_token
if (!activeTokens || activeTokens.length === 0) {
  const { data: user } = await supabase
    .from('users')
    .select('push_token')
    .eq('id', userId)
    .single();
    
  // Use users.push_token as fallback
}

// STEP 3: Send to all found tokens
```

**Strategy:** 
1. First try `push_tokens` table (supports multiple devices)
2. If that fails, use `users.push_token` as backup (legacy)
3. This ensures notifications work even if one system fails

---

## Why This Dual System Exists

### ✅ Benefits:
- **Redundancy:** If one storage fails, the other works
- **Multi-device:** Users can receive notifications on all their devices
- **Backward compatibility:** Old code using `users.push_token` still works
- **Transition period:** During migration, both systems work simultaneously

### ⚠️ Downside:
- **Confusion:** Two places to check
- **Inconsistency:** If one updates but not the other, tokens might not match

---

## Your Specific Situation

### What You Observed:

```sql
-- In users.push_token, you see TWO formats:
1. ExponentPushToken[JIPCpMMxa6lUD1TanBBsKm]  ✅ GOOD (iPhone)
2. f6cde98fa66feca3368b52a2e613970696f9461db... ❌ BAD (Old Android FCM)
```

### What Actually Happened:

1. **iPhone users:** 
   - Had valid `ExponentPushToken` format in `users.push_token`
   - Push notifications were working ✅
   - When they login now, token stays valid and gets copied to both tables

2. **Android users:**
   - Had old raw FCM token (the long hex string) in `users.push_token`
   - This format doesn't work with Expo ❌
   - Push notifications were NOT working
   - Need to logout/login to get new `ExponentPushToken` format

---

## How It Works In Practice

### Scenario 1: User with NEW app version logs in
```
1. App generates: ExponentPushToken[ABC123]
2. Saves to users.push_token: ✅
3. Saves to push_tokens table: ✅
4. When notification sent: Reads from push_tokens first ✅
5. Push notification delivered: ✅
```

### Scenario 2: User with OLD token (hasn't logged in yet)
```
1. Database has: f6cde98fa... (old FCM token)
2. When notification sent: Reads from push_tokens (empty) ❌
3. Falls back to users.push_token: f6cde98fa... ❌
4. Invalid token format, notification fails ❌
5. Solution: User needs to logout/login to get new token
```

### Scenario 3: RLS (Row Level Security) blocks push_tokens table
```
1. App generates: ExponentPushToken[ABC123]
2. Saves to users.push_token: ✅
3. Tries to save to push_tokens: RLS error ❌
4. Code handles gracefully (line 306-308)
5. When notification sent: push_tokens empty, falls back to users.push_token ✅
6. Push notification still works! ✅
```

---

## The Real Problem

### It's NOT about the two tables!

The dual table system actually **helps** you - it provides a fallback!

### The REAL problems are:

1. **❌ Missing FCM Server Key in Expo**
   - Without this, Android push notifications don't work at all
   - **This is the main issue!**

2. **❌ Old token format in database**
   - Some users have old FCM tokens (hex string)
   - These don't work with Expo push service
   - Need to be cleared so users can re-register

---

## Recommended Approach

### Option 1: Keep Both Tables (Recommended)

**Pros:**
- ✅ Multi-device support works
- ✅ Fallback if one system fails
- ✅ No code changes needed
- ✅ Backward compatible

**What to do:**
1. Upload FCM Server Key to Expo
2. Clear old invalid tokens from BOTH tables
3. Users automatically re-register on login
4. Both tables stay in sync

```sql
-- Clean both tables
UPDATE users 
SET push_token = NULL 
WHERE push_token NOT LIKE 'ExponentPushToken[%';

UPDATE push_tokens 
SET is_active = false 
WHERE token NOT LIKE 'ExponentPushToken[%';
```

### Option 2: Use Only One Table (Simplified)

**Pros:**
- ✅ Simpler to understand
- ✅ Only one place to check

**Cons:**
- ❌ Lose multi-device support
- ❌ Requires code changes
- ❌ More risky

**Not recommended unless you have a specific reason**

---

## Final Verdict

### ✅ The dual table system is NOT the problem

Your iPhone notifications were working because:
- iPhone had valid `ExponentPushToken` format
- The fallback system worked correctly

Your Android notifications are NOT working because:
1. **FCM Server Key not uploaded to Expo** ← Main issue
2. Old Android users have invalid FCM token format ← Secondary issue

### 🎯 Solution (Don't touch the table structure!):

1. **Upload FCM credentials to Expo** (critical!)
   ```bash
   eas credentials
   # Add FCM Server Key or JSON
   ```

2. **Clean invalid tokens**
   ```sql
   -- users table
   UPDATE users SET push_token = NULL 
   WHERE push_token NOT LIKE 'ExponentPushToken[%';
   
   -- push_tokens table  
   UPDATE push_tokens SET is_active = false 
   WHERE token NOT LIKE 'ExponentPushToken[%';
   ```

3. **Rebuild and release app**
   ```bash
   eas build --platform android --profile production
   ```

4. **Users logout/login** → New valid tokens generated automatically

---

## Summary

| Storage Location | Purpose | Status |
|------------------|---------|--------|
| `users.push_token` | Legacy single-token storage | ✅ Working as fallback |
| `push_tokens` table | Multi-device support | ✅ Working with fallback |
| **Dual system** | **Provides redundancy** | **✅ This is GOOD!** |
| Old FCM tokens | Invalid format | ❌ Need cleanup |
| Missing FCM key | Android push disabled | ❌ Need to upload |

**Don't remove either table - the dual system is helping you, not hurting you!**

---

## Files to Reference

- `PUSH_NOTIFICATION_IMMEDIATE_ACTIONS.md` - Step-by-step fix guide
- `fix-invalid-push-tokens.sql` - SQL cleanup script for both tables
- `ANDROID_PUSH_NOTIFICATION_FIX.md` - Complete technical documentation

