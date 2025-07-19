# 🚀 Frontend Supabase Configuration Guide

## 📋 Overview

Your Pilates Studio app now supports multiple API modes:
- **REST API** - Traditional backend with Supabase database
- **Supabase Direct** - Direct database access via Supabase client
- **Hybrid Mode** - Automatic fallback between both modes

## 🔧 Configuration Files

### 1. API Configuration (`src/config/api.config.ts`)
```typescript
// Updated to include Supabase backend
CURRENT_ENDPOINT: 'SUPABASE_BACKEND', // Points to your local backend
```

### 2. Supabase Configuration (`src/config/supabase.config.ts`)
```typescript
// Direct Supabase connection
const supabaseUrl = 'https://byhqueksdwlbiwodpbbd.supabase.co';
const supabaseAnonKey = 'your-anon-key';
```

### 3. API Mode Configuration (`src/config/apiMode.config.ts`)
```typescript
// Easy switching between modes
currentMode: 'REST', // Can be 'REST', 'SUPABASE', or 'HYBRID'
```

## 🎯 How to Use

### Option 1: Keep Current REST API (Recommended)
Your app will continue using the traditional REST API, but now it's powered by Supabase:

```typescript
// In your components, continue using the existing API service
import { apiService } from '../services/api';

// This now connects to your Supabase-powered backend
const result = await apiService.get('/classes');
```

### Option 2: Switch to Direct Supabase Access
For real-time features and direct database access:

```typescript
// Use the unified API service
import { unifiedApiService } from '../services/unifiedApi';

// Switch to Supabase mode
unifiedApiService.switchToSupabase();

// Use the same interface
const result = await unifiedApiService.getClasses();
```

### Option 3: Hybrid Mode (Best of Both)
Automatic fallback between REST and Supabase:

```typescript
// Switch to hybrid mode
unifiedApiService.switchToHybrid();

// Will try REST first, then fallback to Supabase if needed
const result = await unifiedApiService.getClasses();
```

## 🧪 Testing Your Configuration

### 1. Start Your Backend
```bash
cd backend
npm start
```

### 2. Start Your Frontend
```bash
npm start
```

### 3. Test the API Configuration
Use the test component to verify everything works:

```typescript
// Import the test component in any screen
import { ApiTest } from '../components/ApiTest';

// Add it to your screen
<ApiTest />
```

## 📱 Integration Examples

### Example 1: Classes Screen
```typescript
import React, { useState, useEffect } from 'react';
import { unifiedApiService } from '../services/unifiedApi';

const ClassesScreen = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      const result = await unifiedApiService.getClasses();
      if (result.success) {
        setClasses(result.data);
      }
    } catch (error) {
      console.error('Failed to load classes:', error);
    } finally {
      setLoading(false);
    }
  };

  // ... rest of your component
};
```

### Example 2: Real-time Updates
```typescript
import { supabaseApiService } from '../services/supabaseApi';

// Subscribe to real-time changes
useEffect(() => {
  const subscription = supabaseApiService.subscribeToChanges('classes', (payload) => {
    console.log('Class updated:', payload);
    // Refresh your data
    loadClasses();
  });

  return () => subscription.unsubscribe();
}, []);
```

## 🔄 Switching Between Modes

### Programmatically
```typescript
import { unifiedApiService } from '../services/unifiedApi';

// Switch to REST API
unifiedApiService.switchToRest();

// Switch to Supabase
unifiedApiService.switchToSupabase();

// Switch to Hybrid
unifiedApiService.switchToHybrid();

// Check current mode
const currentMode = unifiedApiService.getCurrentMode();
```

### Via Configuration
```typescript
// In src/config/apiMode.config.ts
export const API_MODE_CONFIG: ApiModeConfig = {
  currentMode: 'SUPABASE', // Change this to switch modes
  fallbackMode: 'REST',
  enableRealTime: true,
};
```

## 🚀 Benefits of Each Mode

### REST API Mode
- ✅ **Familiar** - Same interface you're used to
- ✅ **Secure** - Backend handles authentication and validation
- ✅ **Flexible** - Easy to add custom business logic
- ✅ **Compatible** - Works with your existing code

### Supabase Direct Mode
- ✅ **Real-time** - Live updates without polling
- ✅ **Fast** - Direct database access
- ✅ **Scalable** - Built-in caching and optimization
- ✅ **Modern** - Latest features and performance

### Hybrid Mode
- ✅ **Reliable** - Automatic fallback if one fails
- ✅ **Flexible** - Can use both approaches
- ✅ **Gradual** - Easy migration path
- ✅ **Best of Both** - REST for complex operations, Supabase for real-time

## 🔧 Environment Variables

For production, you might want to use environment variables:

```typescript
// In src/config/supabase.config.ts
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://byhqueksdwlbiwodpbbd.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your-key';
```

## 📊 Monitoring and Debugging

### Logging Configuration
```typescript
// Log current configuration
import { logApiConfig } from '../config/api.config';
import { logSupabaseConfig } from '../config/supabase.config';
import { unifiedApiService } from '../services/unifiedApi';

logApiConfig();
logSupabaseConfig();
unifiedApiService.logConfiguration();
```

### Error Handling
```typescript
const result = await unifiedApiService.getClasses();
if (!result.success) {
  console.error('API Error:', result.error);
  console.log('Source:', result.source); // 'REST' or 'SUPABASE'
}
```

## 🎯 Recommended Setup

For your Pilates Studio app, I recommend:

1. **Start with REST API mode** - Your existing backend with Supabase database
2. **Test thoroughly** - Use the test component to verify everything works
3. **Gradually migrate** - Switch to hybrid mode for specific features
4. **Enable real-time** - Use Supabase for notifications and live updates

## 🚀 Next Steps

1. **Test the configuration** using the ApiTest component
2. **Update your screens** to use the unified API service
3. **Deploy to Vercel** with the new Supabase environment variables
4. **Monitor performance** and switch modes as needed

## 📞 Support

If you encounter any issues:
1. Check the console logs for detailed error messages
2. Use the ApiTest component to diagnose problems
3. Verify your backend is running on localhost:3000
4. Ensure your Supabase credentials are correct

Your app is now ready to use Supabase! 🎉 