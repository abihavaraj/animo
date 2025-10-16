# Environment Setup Guide

## Create `.env.local` File

Create a file named `.env.local` in the root of your project (`C:\Users\User\Desktop\PilatesStudioApp\.env.local`) with the following content:

```bash
# Supabase Service Role Key for Admin Operations
# This is required for: user creation, password updates, user deletion
SUPABASE_SERVICE_ROLE_KEY=your-complete-service-role-key-here
```

## How to Get Your Service Role Key

1. Go to **Supabase Dashboard**: https://supabase.com/dashboard
2. Select your project: **byhqueksdwlbiwodpbbd**
3. Navigate to: **Project Settings** → **API**
4. Copy the **`service_role`** key (labeled as "secret" - it's a long JWT token)
5. Paste it in your `.env.local` file

## After Creating the File

1. **Save** the `.env.local` file
2. **Restart** your development server:
   ```bash
   # Stop current server (Ctrl+C)
   # Then restart
   npm run web
   ```

## Expected Console Output

After restarting, you should see:
```
🏢 Studio Supabase initialized with storageKey: animo-pilates-studio-auth
🔍 [Supabase Config] Admin Client: ✅ Available
🔍 [Supabase Config] Platform: web
```

## For Production (Vercel)

Add the same environment variable in Vercel:
1. Vercel Dashboard → Your Project → **Settings** → **Environment Variables**
2. Add variable:
   - Name: `SUPABASE_SERVICE_ROLE_KEY`
   - Value: (your service role key)
   - Environments: Production, Preview, Development
3. **Redeploy** your application

---

**⚠️ Security Note:** Never commit `.env.local` to git. It should already be in your `.gitignore` file.

