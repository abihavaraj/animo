# 🔧 Network Troubleshooting Guide

## ✅ **Current Configuration**

### **Backend Status**
- ✅ Backend server is running on port 3000
- ✅ Health endpoint accessible: `http://localhost:3000/health`
- ✅ API endpoints working: `http://localhost:3000/api/plans`
- ✅ CORS configured to allow all origins

### **Frontend Configuration**
- ✅ API URL updated to use IP address: `http://172.20.16.47:3000/api`
- ✅ Debug logging enabled
- ✅ Connection test component added

## 🚀 **Testing Steps**

### **Step 1: Test Connection Component**
1. Start your React Native app
2. Go to the Login screen
3. Click the "Test Connection" button at the top
4. Check the console logs for detailed information

### **Step 2: Check Console Logs**
Look for these log messages:
```
=== API Configuration ===
Current endpoint: LOCAL_IP
URL: http://172.20.16.47:3000/api
========================
```

### **Step 3: Manual Backend Test**
Test these URLs in your browser or Postman:
- Health: `http://172.20.16.47:3000/health`
- Plans: `http://172.20.16.47:3000/api/plans`

## 🔍 **Common Issues & Solutions**

### **Issue 1: "Network request failed"**
**Causes:**
- Mobile device/emulator can't reach your computer's IP
- Firewall blocking connections
- Different network subnets

**Solutions:**
1. **Check Network Connection:**
   - Ensure mobile device and computer are on same WiFi network
   - Try accessing `http://172.20.16.47:3000/health` in mobile browser

2. **Try Different IP Configuration:**
   ```typescript
   // In src/config/api.config.ts, change CURRENT_ENDPOINT to:
   CURRENT_ENDPOINT: 'LOCALHOST', // If using simulator
   ```

3. **Windows Firewall:**
   - Open Windows Defender Firewall
   - Allow Node.js through firewall
   - Or temporarily disable firewall for testing

### **Issue 2: IP Address Changes**
**Solution:**
1. Find your current IP:
   ```bash
   ipconfig | findstr "IPv4"
   ```
2. Update `src/config/api.config.ts`:
   ```typescript
   LOCAL_IP: 'YOUR_NEW_IP_HERE',
   ```

### **Issue 3: Backend Not Accessible via IP**
**Solution:**
Make sure backend binds to all interfaces:
```javascript
// In backend/server.js, change:
app.listen(PORT, () => { // This binds to all interfaces
```

### **Issue 4: Expo/Metro Bundler Issues**
**Solutions:**
1. **Clear Metro Cache:**
   ```bash
   npx expo start --clear
   ```

2. **Use Tunnel Mode:**
   ```bash
   npx expo start --tunnel
   ```

3. **Check Expo DevTools:**
   - Look for network errors in Expo console
   - Check device logs

## 🛠 **Alternative Configurations**

### **Configuration 1: Use Localhost (Simulators Only)**
```typescript
// src/config/api.config.ts
CURRENT_ENDPOINT: 'LOCALHOST',
```

### **Configuration 2: Use Expo Tunnel**
```bash
npx expo start --tunnel
# Then update API config to use tunnel URL
```

### **Configuration 3: Use ngrok**
```bash
npm install -g ngrok
ngrok http 3000
# Use the ngrok URL in your API config
```

## 📱 **Testing on Different Platforms**

### **iOS Simulator**
- Can usually access `localhost:3000`
- Try `LOCALHOST` configuration first

### **Android Emulator**
- Cannot access `localhost` directly
- Must use computer's IP address
- Try `LOCAL_IP` configuration

### **Physical Device**
- Must be on same WiFi network
- Must use computer's IP address
- Check firewall settings

## 🔍 **Debug Commands**

### **Check Backend Health**
```bash
curl http://172.20.16.47:3000/health
```

### **Test Login Endpoint**
```bash
curl -X POST http://172.20.16.47:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pilatesstudio.com","password":"password123"}'
```

### **Check Network Connectivity**
```bash
ping 172.20.16.47
```

## 🚨 **Emergency Fallback**

If all else fails, use mock data temporarily:

1. **Create Mock API Service:**
   ```typescript
   // src/services/mockApi.ts
   export const mockLogin = async (email: string, password: string) => {
     return {
       success: true,
       data: {
         user: { id: 1, email, name: 'Test User', role: 'client' },
         token: 'mock-token'
       }
     };
   };
   ```

2. **Switch to Mock in Login:**
   ```typescript
   // Temporarily replace real API call with mock
   const response = await mockLogin(email, password);
   ```

## 📞 **Next Steps**

1. **Run the connection test** and check console logs
2. **Try accessing** `http://172.20.16.47:3000/health` in mobile browser
3. **Check firewall settings** if connection fails
4. **Try different configurations** if needed
5. **Use tunnel/ngrok** as last resort

The backend is working perfectly - the issue is network connectivity between your mobile app and the backend server. 