# ANIMO Pilates Studio - Deployment Guide

## Overview
This guide covers deploying the ANIMO Pilates Studio app to production, including:
- Backend API (Fly.io)
- Frontend Web Interface (Vercel)
- Mobile App (EAS Build)

## 🚀 Backend Deployment (Fly.io)

### Prerequisites
1. **Fly.io Account**: Sign up at https://fly.io
2. **Fly CLI**: Install with `iwr https://fly.io/install.ps1 -useb | iex`

### Deployment Steps

#### 1. Login to Fly.io
```bash
cd backend
flyctl auth login
```

#### 2. Deploy Backend
```bash
# Option 1: Use the deployment script
.\deploy.ps1

# Option 2: Manual deployment
flyctl deploy
```

#### 3. Set Environment Variables (if needed)
```bash
flyctl secrets set NODE_ENV=production
flyctl secrets set ALLOWED_ORIGINS=https://your-frontend-domain.vercel.app
```

#### 4. Check Deployment Status
```bash
flyctl status
flyctl logs
```

### Backend URLs
- **Production**: `https://animo-pilates-backend.fly.dev`
- **Health Check**: `https://animo-pilates-backend.fly.dev/health`

---

## 🌐 Frontend Deployment (Vercel)

### Prerequisites
1. **Vercel Account**: Sign up at https://vercel.com
2. **Vercel CLI**: Install with `npm i -g vercel`

### Deployment Steps

#### 1. Prepare Frontend
```bash
cd frontend  # (if you have a separate frontend folder)
npm install
npm run build
```

#### 2. Deploy to Vercel
```bash
vercel --prod
```

#### 3. Configure Environment Variables
In Vercel dashboard, set:
- `REACT_APP_API_URL=https://animo-pilates-backend.fly.dev`

---

## 📱 Mobile App Deployment

### Android Build
```bash
# Build for Android
eas build --platform android --profile production

# Submit to Google Play Store
eas submit --platform android
```

### iOS Build
```bash
# Build for iOS (requires Apple Developer Account)
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios
```

---

## 🔧 Configuration Files

### Backend Configuration
- **fly.toml**: Fly.io deployment configuration
- **Dockerfile**: Container configuration
- **server.js**: Main server file with health endpoint

### Frontend Configuration
- **vercel.json**: Vercel deployment configuration
- **package.json**: Dependencies and scripts

### Mobile Configuration
- **app.json**: Expo configuration
- **eas.json**: EAS build configuration

---

## 🌍 Environment Variables

### Backend (Fly.io)
```bash
NODE_ENV=production
PORT=8080
ALLOWED_ORIGINS=https://your-frontend-domain.vercel.app
```

### Frontend (Vercel)
```bash
REACT_APP_API_URL=https://animo-pilates-backend.fly.dev
```

---

## 📊 Monitoring & Maintenance

### Health Checks
- Backend: `https://animo-pilates-backend.fly.dev/health`
- Frontend: Check Vercel dashboard

### Logs
```bash
# Backend logs
flyctl logs

# Frontend logs
# Check Vercel dashboard
```

### Scaling
```bash
# Scale backend
flyctl scale count 2

# Scale memory/CPU
flyctl scale vm shared-cpu-1x --memory 512
```

---

## 🚨 Troubleshooting

### Common Issues

#### Backend Deployment Fails
1. Check `fly.toml` configuration
2. Verify Dockerfile syntax
3. Check server.js health endpoint
4. Review logs: `flyctl logs`

#### Frontend Build Fails
1. Check environment variables
2. Verify API URL configuration
3. Check build logs in Vercel dashboard

#### Mobile Build Fails
1. Check `eas.json` configuration
2. Verify app.json settings
3. Check EAS build logs

### Support Resources
- **Fly.io Docs**: https://fly.io/docs
- **Vercel Docs**: https://vercel.com/docs
- **EAS Docs**: https://docs.expo.dev/eas

---

## 🎯 Quick Deployment Checklist

- [ ] Backend deployed to Fly.io
- [ ] Frontend deployed to Vercel
- [ ] Environment variables configured
- [ ] Health checks passing
- [ ] Mobile builds completed
- [ ] App store submissions ready

---

## 📞 Support

For deployment issues:
1. Check logs for each service
2. Verify configuration files
3. Test endpoints manually
4. Review this guide for common solutions

**Happy Deploying! 🚀** 