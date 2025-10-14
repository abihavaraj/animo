# 🔒 Security Setup Guide

This guide covers how to properly set up environment variables and secure your sensitive credentials.

## ⚠️ CRITICAL: Keys Rotation Required

**Since sensitive keys were previously committed to git, you MUST rotate them immediately:**

1. **Supabase Studio Project Keys**: [https://supabase.com/dashboard/project/byhqueksdwlbiwodpbbd/settings/api](https://supabase.com/dashboard/project/byhqueksdwlbiwodpbbd/settings/api)
2. **Supabase Bar Project Keys**: [https://supabase.com/dashboard/project/grfyzitojijoptyqhujs/settings/api](https://supabase.com/dashboard/project/grfyzitojijoptyqhujs/settings/api)

### Why Rotate Keys?

Git history is permanent. Even though we've removed hardcoded keys from the latest code, they still exist in git history. Anyone with access to your repository history can extract these keys.

---

## 📋 Local Development Setup

### 1. Copy Environment Template

```bash
cp .env.example .env
```

### 2. Fill in Your Credentials

Open `.env` and fill in the values from your Supabase dashboard:

```env
# Studio/Pilates Supabase Project
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Bar Management Supabase Project
EXPO_PUBLIC_BAR_SUPABASE_URL=https://your-bar-project.supabase.co
EXPO_PUBLIC_BAR_SUPABASE_ANON_KEY=your-bar-anon-key
```

### 3. How to Get Supabase Keys

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Settings > API**
4. Copy the following:
   - **Project URL** → `EXPO_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Keep this secret!)

### 4. Firebase Configuration

The `google-services.json` file is required for Android Firebase/FCM functionality:

1. **DO NOT commit this file** (already in `.gitignore`)
2. Download from [Firebase Console](https://console.firebase.google.com/)
3. Place in project root: `google-services.json`
4. Share with team members securely (not via git)

---

## 🚀 Vercel Deployment Setup

### Method 1: Using Vercel Dashboard (Recommended)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Navigate to **Settings > Environment Variables**
4. Add the following variables for **Production**, **Preview**, and **Development**:

| Variable Name | Value | Description |
|--------------|-------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | `https://byhqueksdwlbiwodpbbd.supabase.co` | Studio Supabase URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | Studio anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Studio service role key ⚠️ |
| `EXPO_PUBLIC_BAR_SUPABASE_URL` | `https://grfyzitojijoptyqhujs.supabase.co` | Bar Supabase URL |
| `EXPO_PUBLIC_BAR_SUPABASE_ANON_KEY` | `eyJ...` | Bar anon key |

### Method 2: Using Vercel CLI

```bash
# Set each environment variable
vercel env add EXPO_PUBLIC_SUPABASE_URL production
# Paste your URL when prompted

vercel env add EXPO_PUBLIC_SUPABASE_ANON_KEY production
# Paste your anon key when prompted

vercel env add SUPABASE_SERVICE_ROLE_KEY production
# Paste your service role key when prompted

vercel env add EXPO_PUBLIC_BAR_SUPABASE_URL production
# Paste your bar URL when prompted

vercel env add EXPO_PUBLIC_BAR_SUPABASE_ANON_KEY production
# Paste your bar anon key when prompted
```

### Redeploy After Setting Variables

After adding environment variables, redeploy your app:

```bash
vercel --prod
```

---

## 🔐 Security Best Practices

### ✅ DO:
- Keep `.env` files in `.gitignore`
- Use environment variables for all sensitive data
- Rotate keys immediately after exposure
- Use different keys for development, staging, and production
- Share credentials via secure channels (1Password, LastPass, etc.)

### ❌ DON'T:
- Commit `.env` files to git
- Hardcode API keys in source code
- Share credentials via email, Slack, or chat
- Use production keys in development
- Commit `google-services.json` or similar config files

---

## 🔄 Key Rotation Procedure

### When to Rotate Keys:
- Keys were exposed in git history
- Keys were shared insecurely
- Team member leaves the project
- Suspected security breach
- Regular security audit (every 90 days recommended)

### How to Rotate:

#### 1. Supabase Keys:

Unfortunately, Supabase doesn't allow regenerating API keys directly. You have two options:

**Option A: Create a new project** (Not recommended for production)
- Export your database schema
- Create a new Supabase project
- Import your schema
- Update all environment variables

**Option B: Contact Supabase Support**
- Contact Supabase support to rotate keys
- They can help with enterprise plans

**Option C: Enhanced Security with RLS**
- Ensure all tables have proper Row Level Security (RLS) policies
- This limits what the exposed anon key can access
- Even if the anon key is known, data is protected by RLS

#### 2. Firebase Keys:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings**
4. Delete the current Android app
5. Re-add the Android app
6. Download new `google-services.json`
7. Update locally and distribute to team securely

---

## 📝 Files Protected

The following files are now in `.gitignore` and won't be committed:

- `.env` - Local environment variables
- `.env.local` - Local overrides
- `.env.development` - Development environment
- `.env.production` - Production environment
- `.env.*.local` - Any local environment files
- `google-services.json` - Firebase Android config
- `GoogleService-Info.plist` - Firebase iOS config

---

## 🛠️ Troubleshooting

### Error: "Missing required Supabase environment variables"

**Cause**: `.env` file is missing or variables are not set.

**Solution**:
1. Make sure `.env` file exists in project root
2. Check that all required variables are set in `.env`
3. Restart your development server after adding `.env`

### Expo: Environment variables not loading

**For Expo apps**, environment variables starting with `EXPO_PUBLIC_` are automatically loaded. Others require:

```bash
# Clear Expo cache
npx expo start --clear
```

### Vercel: Environment variables not working

1. Ensure variables are set for correct environment (Production/Preview/Development)
2. Redeploy after adding variables
3. Check build logs for errors

---

## 👥 Team Onboarding

When a new developer joins:

1. Share this guide
2. Provide `.env.example` (already in repository)
3. Securely share actual values via password manager
4. Provide `google-services.json` via secure channel
5. Don't commit their `.env` file

---

## ✅ Checklist

Before deploying:

- [ ] `.env` file created locally with correct values
- [ ] `.env` is in `.gitignore`
- [ ] No hardcoded keys in source code
- [ ] Vercel environment variables set
- [ ] Keys rotated if previously exposed
- [ ] `google-services.json` not committed
- [ ] Team members have access to credentials via secure channel

---

## 🆘 Need Help?

- **Supabase Issues**: [https://supabase.com/docs](https://supabase.com/docs)
- **Vercel Issues**: [https://vercel.com/docs](https://vercel.com/docs)
- **Expo Environment Variables**: [https://docs.expo.dev/guides/environment-variables/](https://docs.expo.dev/guides/environment-variables/)

