# 🚀 Supabase Migration Guide

This guide will help you migrate your Pilates Studio app from SQLite to Supabase.

## 📋 Prerequisites

1. **Supabase Account**: Sign up at [supabase.com](https://supabase.com)
2. **Node.js**: Version 16 or higher
3. **Git**: For version control

## 🎯 Step-by-Step Migration

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: `animo-pilates-studio`
   - **Database Password**: Generate a strong password
   - **Region**: Choose closest to your users
5. Click "Create new project"
6. Wait for project to be ready (2-3 minutes)

### Step 2: Get Supabase Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://your-project.supabase.co`)
   - **Anon Key** (public key)
   - **Service Role Key** (private key - keep secret!)

### Step 3: Set Up Environment Variables

Create a `.env` file in your `backend` directory:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Server Configuration
PORT=3000
NODE_ENV=development

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:8081,http://localhost:19006,http://localhost:3000,https://animo-pilates-studio.vercel.app

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# Notification Configuration
PUSH_NOTIFICATIONS_ENABLED=true
```

### Step 4: Install Supabase Dependencies

```bash
cd backend
npm install @supabase/supabase-js @supabase/postgrest-js
```

### Step 5: Create Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Copy and paste the contents of `supabase/migrations/001_initial_schema.sql`
3. Click "Run" to create all tables and policies

### Step 6: Migrate Data

Run the migration script to move your existing data:

```bash
cd backend
npm run migrate-supabase
```

This will:
- ✅ Connect to your Supabase project
- ✅ Migrate all users
- ✅ Migrate subscription plans
- ✅ Migrate classes and bookings
- ✅ Migrate payments and credits
- ✅ Migrate client data and notes
- ✅ Migrate notifications

### Step 7: Test the Migration

1. Start your backend server:
```bash
cd backend
npm start
```

2. Test the API endpoints:
```bash
curl http://localhost:3000/health
curl http://localhost:3000/api/users
```

### Step 8: Update Frontend Configuration

Update your frontend API configuration to use Supabase:

```typescript:src/config/api.config.ts
export const API_CONFIG = {
  BASE_URL: process.env.NODE_ENV === 'production' 
    ? 'https://your-vercel-app.vercel.app/api'
    : 'http://localhost:3000/api',
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY
};
```

### Step 9: Deploy to Vercel

1. Update your `vercel.json`:

```json:vercel.json
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
    }
  ],
  "env": {
    "SUPABASE_URL": "@supabase_url",
    "SUPABASE_ANON_KEY": "@supabase_anon_key",
    "SUPABASE_SERVICE_ROLE_KEY": "@supabase_service_role_key"
  }
}
```

2. Set environment variables in Vercel:
   - Go to your Vercel project settings
   - Add the Supabase environment variables
   - Redeploy your application

## 🔧 Troubleshooting

### Common Issues

1. **Connection Error**: Check your Supabase URL and keys
2. **Migration Fails**: Ensure your SQLite database exists and is accessible
3. **RLS Policies**: Make sure Row Level Security is properly configured
4. **CORS Issues**: Update your CORS configuration in Supabase

### Debug Commands

```bash
# Test Supabase connection
cd backend
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
supabase.from('users').select('count').then(console.log).catch(console.error);
"

# Check migration status
npm run migrate-supabase
```

## 🎉 Benefits After Migration

### ✅ Real-time Features
- Live booking updates
- Real-time notifications
- Instant data synchronization

### ✅ Better Performance
- PostgreSQL optimization
- Automatic indexing
- Connection pooling

### ✅ Enhanced Security
- Row Level Security (RLS)
- Built-in authentication
- Automatic backups

### ✅ Developer Experience
- Built-in dashboard
- SQL editor
- Real-time logs

### ✅ Scalability
- Automatic scaling
- Global CDN
- Edge functions support

## 📊 Monitoring

After migration, monitor your app:

1. **Supabase Dashboard**: Check database performance
2. **Vercel Analytics**: Monitor API usage
3. **Error Tracking**: Set up error monitoring

## 🔄 Rollback Plan

If you need to rollback:

1. Keep your SQLite database as backup
2. Update environment variables to use SQLite
3. Restart your application

## 📞 Support

- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Community**: Join Supabase Discord

---

**🎯 Next Steps:**
1. Complete the migration
2. Test all features
3. Update your documentation
4. Train your team on Supabase dashboard

Good luck with your migration! 🚀 