# Cancellation & Refund Debug Guide

## Investigation for: Enida Shushku
- **Client ID**: `fb87aba3-2855-4aef-9dd7-2dfbdb1f6623`
- **Issue**: Client says they cancelled a class but it was not refunded

## ✅ Verified Systems Working Correctly

### 1. **Booking History Screen Functionality**
- ✅ **Upcoming bookings**: Display correctly with cancel buttons
- ✅ **Waitlist entries**: Display correctly with leave waitlist buttons  
- ✅ **Past classes count**: Now correctly excludes cancelled bookings (fixed)
- ✅ **Cancel button**: Only shows for upcoming confirmed bookings >2hrs away

### 2. **Client Self-Cancellation Logic**
```typescript
// Location: src/services/bookingService.ts - cancelBooking()
1. ✅ Updates booking status to 'cancelled'
2. ✅ Calls restoreClassToSubscription() - refunds credit
3. ✅ Promotes next person from waitlist
4. ✅ Sends notification to instructor
```

### 3. **Credit Refund Logic**
```typescript
// Location: src/services/bookingService.ts - restoreClassToSubscription()
- ✅ For subscription users: Adds +1 to remaining_classes
- ✅ For daypass users: Adds +1 to user.remaining_classes  
- ✅ Handles both active subscriptions and expired/no subscription cases
```

### 4. **Reception Cancel/Unassign Logic**
```typescript
// Location: src/services/bookingService.ts - cancelClientBooking()
- ✅ Always refunds credits (fixed to always refund regardless of override)
- ✅ Promotes from waitlist
- ✅ Shows success message indicating if someone was promoted
```

## 🔍 How to Debug Enida's Specific Issue

### Step 1: Check Reception Client Profile
1. **Login as reception/admin**
2. **Navigate to User Management**
3. **Search for "Enida Shushku"** 
4. **Click "View Client Profile"** (should open ReceptionClientProfile)
5. **Go to "Bookings" tab**
6. **Look for her booking history**

### Step 2: Check What to Look For
In her booking history, look for:
- ❓ **Cancelled bookings** - Do they show status 'cancelled'?
- ❓ **Dates of cancellations** - When did she cancel?
- ❓ **Subscription status** - Does she have active subscription or daypass credits?
- ❓ **Credit balance changes** - Did her remaining_classes increase after cancellation?

### Step 3: Possible Failure Points

#### **A. Cancellation didn't work at all**
- Booking still shows as 'confirmed' instead of 'cancelled'
- **Cause**: Client app error, network issue, or permission problem
- **Solution**: Check app logs, retry cancellation

#### **B. Cancellation worked but refund failed**
- Booking shows as 'cancelled' but credits weren't restored
- **Cause**: Database permission issue, subscription query failure
- **Solution**: Check restoreClassToSubscription logs

#### **C. Late cancellation**
- Cancelled less than 2 hours before class
- **Expected**: No refund (this is by design)
- **Solution**: Explain policy or manual refund if exception

#### **D. Override assignment**
- **OLD BEHAVIOR**: Override assignments weren't refunded when cancelled
- **NEW BEHAVIOR**: All admin/reception cancellations now refund (fixed)
- **If old cancellation**: Might need manual credit restoration

### Step 4: Database Queries to Debug
```sql
-- Check Enida's booking history
SELECT b.*, c.name as class_name, c.date, c.time, b.status, b.created_at, b.updated_at
FROM bookings b
JOIN classes c ON b.class_id = c.id  
WHERE b.user_id = 'fb87aba3-2855-4aef-9dd7-2dfbdb1f6623'
ORDER BY b.created_at DESC;

-- Check her current subscription/credits
SELECT remaining_classes, credit_balance, status
FROM user_subscriptions 
WHERE user_id = 'fb87aba3-2855-4aef-9dd7-2dfbdb1f6623' 
AND status = 'active';

-- Check her user credits (daypass)
SELECT remaining_classes, credit_balance 
FROM users 
WHERE id = 'fb87aba3-2855-4aef-9dd7-2dfbdb1f6623';
```

## 🔧 How to Fix Common Issues

### **Manual Credit Restoration**
If you find that her cancellation worked but credit wasn't refunded:

```sql
-- For subscription users - add 1 class to active subscription
UPDATE user_subscriptions 
SET remaining_classes = remaining_classes + 1,
    updated_at = NOW()
WHERE user_id = 'fb87aba3-2855-4aef-9dd7-2dfbdb1f6623' 
AND status = 'active';

-- For daypass users - add 1 class to user account
UPDATE users 
SET remaining_classes = remaining_classes + 1
WHERE id = 'fb87aba3-2855-4aef-9dd7-2dfbdb1f6623';
```

### **Prevention for Future**
- ✅ Enhanced logging added to track cancellation and refund process
- ✅ Reception gets clear success messages showing if credits were refunded  
- ✅ All cancellation types now consistently refund credits

## 📊 Console Logs to Watch For

When a client cancels, you should see:
```
✅ SUCCESS: Refunded 1 class to subscription!
📊 Subscription remaining: 5 → 6
```

Or for daypass users:
```
✅ SUCCESS: Refunded 1 class to daypass credits!
📊 Daypass class count: 2 → 3
```

## 🆕 Enhanced Logging System

### **Tracking Console Logs**
I've added comprehensive logging to track every step of the cancellation process. Here's what to look for:

#### **Step 1: Booking Fetch**
```
✅ [CANCEL_TRACKING] STEP 1 SUCCESS - Original booking fetched:
{
  bookingId: "123",
  userId: "fb87aba3-2855-4aef-9dd7-2dfbdb1f6623", 
  classId: "456",
  className: "Morning Pilates",
  classDate: "2024-01-15",
  classTime: "09:00"
}
```

#### **Step 2: Status Update**  
```
✅ [CANCEL_TRACKING] STEP 2 SUCCESS - Booking status updated to cancelled:
{
  bookingId: "123",
  userId: "fb87aba3-2855-4aef-9dd7-2dfbdb1f6623",
  oldStatus: "confirmed", 
  newStatus: "cancelled",
  updatedAt: "2024-01-15T08:30:00.000Z"
}
```

#### **Step 3: Credit Refund**
**For Subscription Users:**
```
✅ [REFUND_TRACKING] SUBSCRIPTION REFUND SUCCESS:
{
  userId: "fb87aba3-2855-4aef-9dd7-2dfbdb1f6623",
  subscriptionId: "789",
  planName: "Monthly 8 Classes",
  classesRestored: 1,
  oldBalance: 3,
  newBalance: 4,
  timestamp: "2024-01-15T08:30:01.000Z"
}
```

**For Daypass Users:**
```
✅ [REFUND_TRACKING] DAYPASS REFUND SUCCESS:
{
  userId: "fb87aba3-2855-4aef-9dd7-2dfbdb1f6623", 
  classesRestored: 1,
  oldBalance: 1,
  newBalance: 2,
  creditBalance: 50,
  timestamp: "2024-01-15T08:30:01.000Z"
}
```

#### **Step 4: Waitlist Promotion**
```
✅ [CANCEL_TRACKING] STEP 4 SUCCESS - Waitlist promotion result: PROMOTED
```

#### **Final Summary**
```
🎉 [CANCEL_TRACKING] CANCELLATION COMPLETED SUCCESSFULLY:
{
  bookingId: "123",
  userId: "fb87aba3-2855-4aef-9dd7-2dfbdb1f6623",
  summary: {
    step1_fetch_booking: "✅ SUCCESS",
    step2_update_status: "✅ SUCCESS", 
    step3_refund_credit: "✅ SUCCESS",
    step4_waitlist_promotion: "✅ PROMOTED"
  }
}
```

### **Error Scenarios to Watch For**

#### **Database Permission Error**
```
❌ [REFUND_TRACKING] SUBSCRIPTION REFUND FAILED:
{
  message: "permission denied for table user_subscriptions",
  code: "42501",
  userId: "fb87aba3-2855-4aef-9dd7-2dfbdb1f6623"
}
```
**Fix**: Check RLS policies on user_subscriptions table

#### **Network/App Error**  
```
💥 [CANCEL_TRACKING] CANCELLATION FAILED WITH EXCEPTION:
{
  bookingId: "123",
  error: "Network request failed",
  timestamp: "2024-01-15T08:30:00.000Z"
}
```
**Fix**: Check network connectivity, retry operation

#### **User Not Found Error**
```
❌ [REFUND_TRACKING] DAYPASS REFUND FAILED - Error fetching user data:
{
  message: "No rows returned",
  code: "PGRST116", 
  userId: "invalid-id"
}
```
**Fix**: Verify user ID is correct

### **How to Use Logs for Debugging**

1. **Open browser console** when client cancels
2. **Filter logs** by searching for `[CANCEL_TRACKING]` or `[REFUND_TRACKING]`
3. **Follow the steps** 1→2→3→4 to see where it fails
4. **Note the specific error details** for database issues
5. **Check the final summary** to confirm all steps completed

### **Quick Debug Commands**

```javascript
// In browser console - filter for cancellation logs
console.clear();
// Then have user cancel booking, all logs will show the process
```

## Next Steps for Enida
1. **Enable console logging** during her next cancellation attempt
2. **Check her profile** using the steps above
3. **Follow the log trail** to identify exact failure point
4. **Apply manual fix** based on specific error found
5. **Document the root cause** to prevent future issues

## Prevention Strategy
- ✅ **Enhanced logging** now tracks every step
- ✅ **Detailed error messages** with database codes
- ✅ **Graceful failure handling** - cancellation won't fail if refund fails
- ✅ **Clear success indicators** show what worked vs failed
