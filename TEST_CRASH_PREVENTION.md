# 🧪 Crash Prevention System Test Guide

## 🎯 **How to Test the Crash Prevention System**

### **Step 1: Access the Test**
1. Start the Expo development server: `npm start`
2. Open the app on your device/simulator
3. Log in as a client user
4. Look for the red "Test" button in the welcome header (only visible in development)
5. Tap the "Test" button to navigate to the crash prevention test screen

### **Step 2: Run the Tests**

#### **Test 1: Promise Rejection Safety**
- Tap "Test Promise Rejection"
- **Expected Result**: App should stay running, no crash
- **Console**: Should see `🚨 Unhandled Promise Rejection: Test unhandled promise rejection`
- **UI**: Should show "Promise rejection test completed - app should still be running!"

#### **Test 2: Global Error Handler**
- Tap "Test Global Error"
- **Expected Result**: App should stay running, no crash
- **Console**: Should see `🚨 Global Error Handler caught: Test global error handler`
- **UI**: Should show "Global error test completed - app should still be running!"

#### **Test 3: Network Error Handling**
- Tap "Test Network Error"
- **Expected Result**: App should handle the network error gracefully
- **Console**: Should see network error logs
- **UI**: Should show "Network error caught and handled gracefully!"

#### **Test 4: ErrorBoundary Component**
- Tap "Trigger Component Error"
- **Expected Result**: Should see the ErrorBoundary fallback UI
- **UI**: Should show error message with "Try Again" and "Force Refresh" buttons

### **Step 3: Verify System Status**
The test screen should show:
- ✅ Global error handlers: ACTIVE
- ✅ ErrorBoundary components: ACTIVE
- ✅ Network error handling: ACTIVE
- ✅ Promise rejection safety: ACTIVE
- ✅ Development debugging: ACTIVE

## 🔍 **What to Look For**

### **✅ Success Indicators**
- App continues running after errors
- No crashes or app termination
- User-friendly error messages
- Recovery options available
- Detailed console logging in development

### **❌ Failure Indicators**
- App crashes or closes unexpectedly
- No error messages shown
- No recovery options available
- Silent failures with no logging

## 🛠️ **Manual Testing Without the Test Screen**

You can also test manually by adding this code to any component:

```javascript
// Test global error handler
setTimeout(() => {
  throw new Error('Manual test error');
}, 2000);

// Test promise rejection
setTimeout(() => {
  Promise.reject(new Error('Manual test promise rejection'));
}, 3000);
```

## 📊 **Expected Console Output**

When tests are working correctly, you should see:

```
🛡️ Setting up global error handlers...
✅ Global error handlers initialized
🚨 Global Error Handler caught: Test global error handler
[DEV ERROR] Global Error Details: { message: "...", stack: "...", isFatal: false }
🚨 Unhandled Promise Rejection: Test unhandled promise rejection
[DEV ERROR] Promise Rejection Details: { reason: "...", promise: Promise }
🌐 Network Error: TypeError: Failed to fetch
[DEV ERROR] Network Error Details: { message: "...", endpoint: "...", stack: "..." }
🔄 ErrorBoundary: Attempting recovery...
```

## 🎉 **Success Criteria**

The crash prevention system is working if:
1. **No App Crashes**: App stays running after all error tests
2. **Error Recovery**: Users can continue using the app after errors
3. **User Feedback**: Clear error messages are shown to users
4. **Developer Debugging**: Detailed error logs appear in console
5. **Graceful Degradation**: App functionality continues even when errors occur

---

## ✅ **Test Complete!**

If all tests pass, your crash prevention system is working correctly and will prevent the crashes you experienced in your original crash report. 