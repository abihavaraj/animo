# 🚀 Supabase + Vercel Setup Guide

## 📋 **Your Architecture**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Supabase      │    │   Vercel        │
│   (React Native)│◄──►│   (Backend)     │    │   (Hosting)     │
│                 │    │                 │    │                 │
│ • User Interface│    │ • Database      │    │ • Web App       │
│ • Business Logic│    │ • Authentication│    │ • Static Files  │
│ • API Calls     │    │ • Real-time     │    │ • CDN           │
│ • State Mgmt    │    │ • Storage       │    │ • SSL           │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🎯 **Why This Setup?**

### ✅ **Advantages:**
- **No Backend Deployment** - Supabase handles everything
- **Real-time Features** - Live updates automatically
- **Scalable** - Supabase scales automatically
- **Secure** - Row Level Security (RLS) built-in
- **Fast** - Direct database access
- **Simple** - Less moving parts

### ❌ **Trade-offs:**
- **Less Control** - Business logic in frontend
- **Limited Complexity** - Can't do complex server operations
- **Security Concerns** - Logic exposed in frontend

## 🔧 **Current Configuration**

### **API Mode: SUPABASE**
```typescript
// src/config/apiMode.config.ts
export const API_MODE_CONFIG = {
  currentMode: 'SUPABASE', // Using Supabase as backend
  fallbackMode: 'REST',    // Fallback to REST if needed
  enableRealTime: true,    // Real-time features enabled
};
```

### **Supabase Configuration**
```typescript
// src/config/supabase.config.ts
export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);
```

## 🚀 **Deployment Steps**

### **1. Frontend (Vercel)**
Your frontend is already deployed at: `https://animo-pilates-studio.vercel.app/`

### **2. Supabase (Backend)**
- ✅ **Database**: PostgreSQL with your data
- ✅ **Authentication**: User management
- ✅ **Real-time**: Live updates
- ✅ **Storage**: File uploads
- ✅ **RLS**: Row Level Security

### **3. Environment Variables**
Make sure these are set in your Vercel project:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 🧪 **Testing Your Setup**

### **1. Test Supabase Connection**
1. Open your app: `https://animo-pilates-studio.vercel.app/`
2. Navigate to "Supabase Test" in Quick Actions
3. Click "Test Connection"
4. Verify all tests pass ✅

### **2. Test Real-time Features**
```typescript
// Subscribe to live updates
unifiedApiService.subscribeToClasses((payload) => {
  console.log('Class updated:', payload);
});

unifiedApiService.subscribeToBookings((payload) => {
  console.log('Booking updated:', payload);
});
```

### **3. Test API Operations**
```typescript
// Get classes
const classes = await unifiedApiService.getClasses();

// Create booking
const booking = await unifiedApiService.createBooking({
  class_id: '123',
  user_id: '456',
  status: 'confirmed'
});

// Get user
const user = await unifiedApiService.getCurrentUser();
```

## 🔄 **API Service Architecture**

### **Unified API Service**
```typescript
// src/services/unifiedApi.ts
class UnifiedApiService {
  // Automatically switches between REST and Supabase
  async getClasses() {
    return this.withFallback(
      () => supabaseApiService.getClasses(),    // Primary: Supabase
      () => apiService.get('/classes')          // Fallback: REST
    );
  }
}
```

### **Supabase API Service**
```typescript
// src/services/supabaseApi.ts
class SupabaseApiService {
  async getClasses() {
    const { data, error } = await this.supabase
      .from('classes')
      .select('*')
      .order('created_at', { ascending: false });
    return this.handleResponse(data, error);
  }
}
```

## 🛡️ **Security Features**

### **Row Level Security (RLS)**
```sql
-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- Users can only book for themselves
CREATE POLICY "Users can create own bookings" ON bookings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### **Authentication**
```typescript
// Sign up
await unifiedApiService.signUp(email, password, userData);

// Sign in
await unifiedApiService.signIn(email, password);

// Get current user
const user = await unifiedApiService.getCurrentUser();
```

## 📊 **Monitoring & Debugging**

### **1. Supabase Dashboard**
- Go to: `https://supabase.com/dashboard`
- Monitor: Database, Auth, Storage, Logs

### **2. Vercel Dashboard**
- Go to: `https://vercel.com/dashboard`
- Monitor: Deployments, Analytics, Functions

### **3. Real-time Logs**
```typescript
// Enable debug logging
import { devLog } from '../utils/devUtils';
devLog('🔄 Using Supabase API');
```

## 🔧 **Troubleshooting**

### **Common Issues:**

1. **Connection Failed**
   - Check environment variables
   - Verify Supabase URL and key
   - Test with Supabase Test component

2. **Authentication Issues**
   - Check RLS policies
   - Verify user permissions
   - Test auth flow

3. **Real-time Not Working**
   - Check if real-time is enabled
   - Verify Supabase mode is active
   - Test subscription callbacks

### **Debug Commands:**
```bash
# Test Supabase connection
npm run test:supabase

# Check environment variables
echo $EXPO_PUBLIC_SUPABASE_URL

# Clear cache and restart
npx expo start --clear
```

## 🎉 **Benefits of This Setup**

1. **🚀 Fast Development** - No backend deployment needed
2. **⚡ Real-time** - Live updates automatically
3. **🔒 Secure** - RLS and auth built-in
4. **📈 Scalable** - Supabase handles scaling
5. **💰 Cost-effective** - Pay only for what you use
6. **🛠️ Simple** - Less infrastructure to manage

## 📝 **Next Steps**

1. **Test the Setup** - Use the Supabase Test component
2. **Configure RLS** - Set up security policies
3. **Add Real-time** - Implement live updates
4. **Monitor Usage** - Track Supabase usage
5. **Optimize** - Fine-tune queries and performance

---

**🎯 Your app is now using Supabase as the backend with Vercel hosting!** 