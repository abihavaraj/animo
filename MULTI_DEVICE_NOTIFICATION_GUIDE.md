# 📱📱 Multi-Device Notification Support Guide

## ❓ Your Question Answered

**Q:** "If client logs in on Android, then another day logs in on iPhone, will both work?"

**A:** Yes! **But you need to run the RLS fix first** to enable multi-device support.

---

## 🔍 The Current Limitation (Before RLS Fix)

### How it works NOW (single device):

```
Day 1: User logs in on Android
  → Saves Android token to users.push_token
  → Android notifications work ✅

Day 2: User logs in on iPhone
  → OVERWRITES users.push_token with iPhone token  
  → iPhone notifications work ✅
  → Android notifications STOP working ❌ (token was replaced)
```

**Only the LAST device to login receives notifications!**

---

## ✅ The Solution (Multi-Device Support)

### Step 1: Enable RLS Policies on `push_tokens` Table

**Run this SQL in Supabase SQL Editor:**

```sql
-- File: fix-push-tokens-rls.sql (created for you)
```

This allows users to save tokens from **multiple devices** in the `push_tokens` table.

### Step 2: How it works AFTER RLS fix:

```
Day 1: User logs in on Android
  → Saves to push_tokens: { user_id, token: "Android-token", device_type: "android" }
  → Android notifications work ✅

Day 2: User logs in on iPhone
  → Saves to push_tokens: { user_id, token: "iPhone-token", device_type: "ios" }
  → iPhone notifications work ✅
  → Android notifications STILL work ✅ (both tokens stored!)
```

**Both devices receive notifications!** 🎉

---

## 🛠️ Implementation Steps

### 1️⃣ Run RLS Fix (REQUIRED)

Open Supabase SQL Editor and run:

```sql
-- Copy contents from: fix-push-tokens-rls.sql
```

This creates RLS policies that allow users to:
- ✅ INSERT their own tokens (for new devices)
- ✅ UPDATE their own tokens (for token refresh)
- ✅ SELECT their own tokens (to read them)
- ✅ DELETE their own tokens (on logout)

### 2️⃣ Verify Policies Created

After running the SQL, verify with:

```sql
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'push_tokens';
```

Expected output:
```
✅ Users can insert their own push tokens | INSERT
✅ Users can update their own push tokens | UPDATE
✅ Users can view their own push tokens   | SELECT
✅ Users can delete their own push tokens | DELETE
✅ Admins can view all push tokens        | SELECT
```

### 3️⃣ Test Multi-Device Support

**Test Scenario:**

1. **Login on Android**
   - Watch console for: "Push token registered in push_tokens table successfully"
   - Check database: `SELECT * FROM push_tokens WHERE user_id = 'your-user-id'`
   - Should see 1 entry with `device_type = 'android'`

2. **Login on iPhone** (same user)
   - Watch console for: "Push token registered in push_tokens table successfully"
   - Check database again
   - Should see 2 entries: one Android, one iOS ✅

3. **Send Notification**
   - Admin sends test notification
   - Console shows: "Sending to 2 device(s): android, ios"
   - **Both devices receive notification!** ✅

---

## 📊 How Multi-Device Works

### Database Structure:

**`push_tokens` table:**
```
| user_id | token                   | device_type | device_name     | is_active |
|---------|------------------------|-------------|-----------------|-----------|
| user123 | ExponentPushToken[AAA] | android     | Samsung Galaxy  | true      |
| user123 | ExponentPushToken[BBB] | ios         | iPhone 14       | true      |
```

### Notification Flow:

1. **Notification triggered** (e.g., class booking)
2. **Query all active tokens** for that user:
   ```sql
   SELECT token FROM push_tokens 
   WHERE user_id = 'user123' AND is_active = true;
   ```
3. **Returns:** `['ExponentPushToken[AAA]', 'ExponentPushToken[BBB]']`
4. **Send to ALL tokens** (both Android and iPhone)
5. **Both devices receive notification** ✅

---

## 🔄 Fallback Mechanism

The updated code has a **smart fallback**:

```typescript
// Try push_tokens table first (multi-device)
const { data: tokens } = await supabase
  .from('push_tokens')
  .select('token, device_type')
  .eq('user_id', userId);

if (!tokens || tokens.length === 0) {
  // Fallback to users.push_token (single device)
  const { data: user } = await supabase
    .from('users')
    .select('push_token')
    .eq('id', userId);
  
  // Send to single token
}
```

This means:
- ✅ **With RLS fixed**: Multi-device support works
- ✅ **Without RLS fixed**: Falls back to single device (current behavior)
- ✅ **Graceful degradation**: Never breaks existing functionality

---

## 🧪 Testing Checklist

After running RLS fix:

- [ ] Login on Android → Check `push_tokens` table has Android entry
- [ ] Login on iPhone → Check `push_tokens` table has 2 entries (Android + iOS)
- [ ] Send test notification → Console shows "Sending to 2 device(s)"
- [ ] Android receives notification ✅
- [ ] iPhone receives notification ✅
- [ ] Logout from Android → Check `push_tokens` table (Android token should be deleted or `is_active = false`)
- [ ] Send notification → Only iPhone receives it ✅

---

## 📝 Console Logs to Watch For

### Success (Multi-Device Working):

```
📱 [sendPushNotificationToUser] Sending to user xxx with multi-device support
📱 [sendPushNotificationToUser] Sending to 2 device(s): android, ios
✅ Sent to android device (Samsung Galaxy)
✅ Sent to ios device (iPhone 14)
✅ [sendPushNotificationToUser] Completed sending to 2 device(s)
```

### Fallback (RLS Not Fixed Yet):

```
📱 [sendPushNotificationToUser] No tokens in push_tokens table, trying users.push_token fallback
📱 [sendPushNotificationToUser] Sending to 1 device(s): unknown
✅ Sent to unknown device (Legacy Device)
```

---

## 🎯 Before vs After Comparison

### BEFORE RLS Fix:

| User Action | Android Notifications | iPhone Notifications |
|------------|----------------------|---------------------|
| Login on Android | ✅ Works | ❌ Stops working |
| Login on iPhone | ❌ Stops working | ✅ Works |
| **Result** | **Only last device works** | **Only last device works** |

### AFTER RLS Fix:

| User Action | Android Notifications | iPhone Notifications |
|------------|----------------------|---------------------|
| Login on Android | ✅ Works | ⚪ (not logged in yet) |
| Login on iPhone | ✅ **Still works!** | ✅ Works |
| **Result** | **✅ Both work!** | **✅ Both work!** |

---

## ⚠️ Important Notes

### 1. RLS Fix is Required
Without running `fix-push-tokens-rls.sql`, the app will fall back to single-device mode (current behavior).

### 2. Existing Tokens Preserved
The fix doesn't delete existing tokens. Both systems work in parallel:
- `users.push_token` - Legacy, single device
- `push_tokens` - New, multi-device

### 3. Automatic Migration
When users login after RLS fix:
- Their token is saved to BOTH tables
- Notifications try `push_tokens` first
- Falls back to `users.push_token` if needed

### 4. Safe to Deploy
- ✅ Non-breaking change
- ✅ Works with or without RLS fix
- ✅ Existing single-device users unaffected
- ✅ Multi-device support enabled once RLS fixed

---

## 🔍 Troubleshooting

### Issue: "RLS policy prevents push_tokens table insert"

**Solution:** Run the RLS fix SQL script:
```sql
-- See file: fix-push-tokens-rls.sql
```

### Issue: Only last device receives notifications

**Check:** Have you run the RLS fix?
```sql
SELECT COUNT(*) FROM pg_policies WHERE tablename = 'push_tokens';
-- Should return 5 (or more)
```

### Issue: No tokens in push_tokens table

**Check:** Is RLS blocking writes?
```sql
-- Test as your user
SELECT * FROM push_tokens WHERE user_id = auth.uid();
-- Should return your tokens, not "permission denied"
```

### Issue: Old devices still receive notifications after logout

**Solution:** Update logout to mark tokens as inactive:
```sql
UPDATE push_tokens 
SET is_active = false 
WHERE user_id = 'xxx' AND device_id = 'yyy';
```

---

## 📚 Related Files

1. **`fix-push-tokens-rls.sql`** - Run this to enable multi-device support
2. **`src/services/notificationService.ts`** - Updated with multi-device logic
3. **`src/services/pushNotificationService.ts`** - Registers tokens to both tables
4. **`App.tsx`** - Token validation on login

---

## ✅ Summary

**To enable multi-device support:**

1. ✅ Run `fix-push-tokens-rls.sql` in Supabase
2. ✅ Users login on multiple devices
3. ✅ All devices receive notifications
4. ✅ Done!

**Without RLS fix:**
- Single device only (last login wins)
- Current behavior maintained
- No breaking changes

**With RLS fix:**
- Multi-device support enabled
- All user devices receive notifications
- Seamless cross-platform experience

🎉 **Your users can now use Android AND iPhone and receive notifications on both!**

