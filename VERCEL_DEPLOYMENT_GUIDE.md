# 🚀 Vercel Deployment Guide with Supabase

## 📋 Overview

This guide will help you deploy your Pilates Studio app to Vercel with the new Supabase backend.

## 🔧 Prerequisites

1. **Vercel Account** - Sign up at [vercel.com](https://vercel.com)
2. **Supabase Project** - Already configured ✅
3. **GitHub Repository** - Your code should be in a Git repository

## 🚀 Step 1: Prepare Your Repository

### 1.1 Update Environment Variables
Create a `.env.local` file in your project root (for local testing):

```bash
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://byhqueksdwlbiwodpbbd.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5aHF1ZWtzZHdsYml3b2RwYmJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4NjA0NzgsImV4cCI6MjA2ODQzNjQ3OH0.UpbbA73l8to48B42AWiGaL8sXkOmJIqeisbaDg-u-Io

# Backend URL (for production)
EXPO_PUBLIC_API_URL=https://your-backend-url.vercel.app/api
```

### 1.2 Update API Configuration
Update `src/config/api.config.ts` to use environment variables:

```typescript
export const API_CONFIG: ApiConfig = {
  LOCAL_IP: '192.168.100.37',
  
  ENDPOINTS: {
    LOCALHOST: 'http://localhost:3000/api',
    LOCAL_IP: 'http://192.168.100.37:3000/api',
    PRODUCTION: process.env.EXPO_PUBLIC_API_URL || 'https://your-backend-url.vercel.app/api',
    SUPABASE_BACKEND: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api',
  },
  
  CURRENT_ENDPOINT: 'PRODUCTION', // Change to PRODUCTION for deployment
};
```

## 🚀 Step 2: Deploy Backend to Vercel

### 2.1 Prepare Backend for Deployment

Create a `vercel.json` file in your project root:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "backend/server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "backend/server.js"
    },
    {
      "src": "/(.*)",
      "dest": "backend/server.js"
    }
  ],
  "env": {
    "SUPABASE_URL": "https://byhqueksdwlbiwodpbbd.supabase.co",
    "SUPABASE_SERVICE_ROLE_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5aHF1ZWtzZHdsYml3b2RwYmJkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg2MDQ3OCwiZXhwIjoyMDY4NDM2NDc4fQ.AaWYRUo7jZIb48uZtCl__49sNsU_jPFCA0Auyg2ffeQ"
  }
}
```

### 2.2 Deploy Backend

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy Backend**:
   ```bash
   cd backend
   vercel --prod
   ```

4. **Note the deployment URL** (e.g., `https://your-backend.vercel.app`)

### 2.3 Update Frontend Configuration

Update your `src/config/api.config.ts` with the new backend URL:

```typescript
export const API_CONFIG: ApiConfig = {
  LOCAL_IP: '192.168.100.37',
  
  ENDPOINTS: {
    LOCALHOST: 'http://localhost:3000/api',
    LOCAL_IP: 'http://192.168.100.37:3000/api',
    PRODUCTION: 'https://your-backend.vercel.app/api', // Update this
    SUPABASE_BACKEND: 'https://your-backend.vercel.app/api', // Update this
  },
  
  CURRENT_ENDPOINT: 'PRODUCTION',
};
```

## 🚀 Step 3: Deploy Frontend to Vercel

### 3.1 Build for Web

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Build for web**:
   ```bash
   npm run build:web
   ```

### 3.2 Deploy to Vercel

1. **Create a new Vercel project**:
   ```bash
   vercel
   ```

2. **Configure environment variables** in Vercel dashboard:
   - `EXPO_PUBLIC_SUPABASE_URL`: `https://byhqueksdwlbiwodpbbd.supabase.co`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Your anon key
   - `EXPO_PUBLIC_API_URL`: Your backend URL

3. **Deploy**:
   ```bash
   vercel --prod
   ```

## 🔧 Alternative: Deploy via GitHub

### 1. Push to GitHub
```bash
git add .
git commit -m "Add Supabase configuration"
git push origin main
```

### 2. Connect to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Configure build settings:
   - **Framework Preset**: Expo
   - **Build Command**: `npm run build:web`
   - **Output Directory**: `web-build`

### 3. Set Environment Variables
In Vercel dashboard → Settings → Environment Variables:

```
EXPO_PUBLIC_SUPABASE_URL=https://byhqueksdwlbiwodpbbd.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_API_URL=https://your-backend.vercel.app/api
```

## 🧪 Testing Deployment

### 1. Test Backend
```bash
curl https://your-backend.vercel.app/health
```

### 2. Test Frontend
Visit your frontend URL and:
1. Navigate to the API Test screen
2. Run the tests to verify Supabase connection
3. Check that data loads correctly

## 🔧 Troubleshooting

### Common Issues:

1. **CORS Errors**:
   - Ensure your backend has proper CORS configuration
   - Check that the frontend URL is allowed

2. **Environment Variables**:
   - Verify all environment variables are set in Vercel
   - Check that variable names match your code

3. **Build Errors**:
   - Check that all dependencies are installed
   - Verify TypeScript compilation

4. **API Connection**:
   - Test backend health endpoint
   - Check Supabase connection
   - Verify API endpoints are correct

### Debug Steps:

1. **Check Vercel Logs**:
   ```bash
   vercel logs
   ```

2. **Test Locally**:
   ```bash
   npm run build:web
   npx serve web-build
   ```

3. **Verify Environment**:
   ```bash
   vercel env ls
   ```

## 🚀 Production Checklist

- [ ] Backend deployed to Vercel
- [ ] Frontend deployed to Vercel
- [ ] Environment variables configured
- [ ] API endpoints updated
- [ ] Supabase connection tested
- [ ] All features working
- [ ] Performance optimized
- [ ] Error monitoring set up

## 📊 Monitoring

### 1. Vercel Analytics
- Monitor performance in Vercel dashboard
- Check for errors and issues

### 2. Supabase Monitoring
- Monitor database performance
- Check for connection issues

### 3. Custom Monitoring
Add error tracking to your app:

```typescript
// In your API service
if (!result.success) {
  console.error('API Error:', result.error);
  // Send to your error tracking service
}
```

## 🎉 Success!

Your Pilates Studio app is now deployed with:
- ✅ **Supabase Database** - Scalable PostgreSQL
- ✅ **Vercel Backend** - Serverless API
- ✅ **Vercel Frontend** - Fast web deployment
- ✅ **Real-time Features** - Live updates
- ✅ **Production Ready** - Optimized for scale

## 📞 Support

If you encounter issues:
1. Check Vercel deployment logs
2. Test API endpoints manually
3. Verify Supabase connection
4. Review environment variables
5. Test locally first

Your app is now ready for production! 🚀 