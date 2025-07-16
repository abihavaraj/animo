# ANIMO Pilates Studio – Deployment Checklist

This guide covers what to do **after making local changes** to your project, for each part of your app:
- Backend (API)
- Frontend (Web)
- Android App
- iOS App

---

## 1. Backend (API) – Fly.io

**After making changes to backend code:**

1. **Test Locally**
   - Run your backend locally:
     ```sh
     cd backend
     node server.js
     ```
   - Test your API endpoints (use Postman, browser, or frontend app).

2. **Deploy to Fly.io**
   - Build and deploy:
     ```sh
     cd backend
     flyctl deploy
     ```
   - Wait for deployment to finish.

3. **Verify Production**
   - Check health: https://animo-pilates-backend.fly.dev/health
   - Test API endpoints in production.

---

## 2. Frontend (Web) – Vercel

**After making changes to frontend/web code:**

1. **Test Locally**
   - Run the web app locally:
     ```sh
     npm run web
     # or
     expo start --web
     ```
   - Open http://localhost:19006 or the shown URL in your browser.
   - Test all features.

2. **Build and Deploy to Vercel**
   - Build and deploy:
     ```sh
     npm run build:web
     vercel --prod
     ```
   - When prompted for output directory, enter:
     ```
     dist
     ```

3. **Verify Production**
   - Visit: https://animo-pilates-studio.vercel.app
   - Test all features in production.

---

## 3. Android App – Google Play / EAS

**After making changes to the mobile app:**

1. **Test Locally**
   - Run on a device or emulator:
     ```sh
     npm run android
     # or
     expo run:android
     ```
   - Test all features.

2. **Build for Production**
   - Build the APK/AAB:
     ```sh
     eas build --platform android --profile production
     ```
   - Download the build from the EAS dashboard.

3. **Submit to Google Play**
   - Submit the new build:
     ```sh
     eas submit --platform android
     ```
   - Or upload manually via Google Play Console.

4. **Verify on Google Play**
   - Download the app from Google Play (internal test, closed test, or production).
   - Test all features.

---

## 4. iOS App – App Store / EAS

**After making changes to the mobile app:**

1. **Test Locally**
   - Run on a simulator or device:
     ```sh
     npm run ios
     # or
     expo run:ios
     ```
   - Test all features.

2. **Build for Production**
   - Build the IPA:
     ```sh
     eas build --platform ios --profile production
     ```
   - Download the build from the EAS dashboard.

3. **Submit to App Store**
   - Submit the new build:
     ```sh
     eas submit --platform ios
     ```
   - Or upload manually via Transporter or App Store Connect.

4. **Verify on App Store**
   - Download the app from TestFlight or App Store.
   - Test all features.

---

## General Tips
- Always test thoroughly locally before deploying.
- Check production URLs after deployment.
- Roll back if you find critical issues.
- Keep your dependencies up to date.

---

**Happy Deploying! 🚀** 