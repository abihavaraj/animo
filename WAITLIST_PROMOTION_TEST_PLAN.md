# Waitlist Promotion Testing Plan

## Test Scenarios

### ✅ Scenario 1: Normal Waitlist Promotion (2+ hours)
1. Create a class 3 hours in the future
2. Fill the class to capacity
3. Add user to waitlist
4. Have someone cancel their booking
5. **Expected**: Waitlist user automatically promoted and credits deducted

### ✅ Scenario 2: No Promotion (< 2 hours)
1. Create a class 1.5 hours in the future
2. Fill the class to capacity
3. Add user to waitlist
4. Have someone cancel their booking
5. **Expected**: No waitlist promotion occurs

### ✅ Scenario 3: Insufficient Credits Rollback
1. Create a class 3 hours in the future
2. Fill the class to capacity
3. Add user with 0 remaining classes to waitlist
4. Have someone cancel their booking
5. **Expected**: Booking created then rolled back, user removed from waitlist

### ✅ Scenario 4: Multiple Waitlist Users
1. Create a class 3 hours in the future
2. Fill the class to capacity
3. Add multiple users to waitlist (User A: 0 credits, User B: has credits)
4. Have someone cancel their booking
5. **Expected**: User A fails (no credits), User B gets promoted successfully

## Log Messages to Monitor

```
🚀 [WAITLIST] Starting promotion process for class X
✅ [WAITLIST] Class is X.X hours away. Proceeding with waitlist promotion.
⏰ [WAITLIST] Class is only X.X hours away. Waitlist promotion requires 2+ hours notice.
💰 [WAITLIST] STARTING CREDIT DEDUCTION for user X
✅ [WAITLIST] SUCCESS: Credit deducted for user X
❌ [WAITLIST] CRITICAL: Credit deduction FAILED for user X
🔄 [WAITLIST] Booking X rolled back due to insufficient credits
```

## Backend Validation Commands

```javascript
// Test credit deduction
const result = await bookingService.deductClassFromSubscription('user-id');
console.log('Credit deduction result:', result);

// Test waitlist promotion
const promoted = await bookingService.promoteFromWaitlist(classId);
console.log('Promotion result:', promoted);
```