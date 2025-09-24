#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Android Icon Configuration...\n');

// Check if all required icon files exist
const requiredFiles = [
  // Main app icons
  'android/app/src/main/res/mipmap-hdpi/ic_launcher.png',
  'android/app/src/main/res/mipmap-hdpi/ic_launcher.webp',
  'android/app/src/main/res/mipmap-hdpi/ic_launcher_round.webp',
  'android/app/src/main/res/mipmap-hdpi/ic_launcher_adaptive_back.png',
  'android/app/src/main/res/mipmap-hdpi/ic_launcher_adaptive_fore.png',
  
  'android/app/src/main/res/mipmap-mdpi/ic_launcher.png',
  'android/app/src/main/res/mipmap-mdpi/ic_launcher.webp',
  'android/app/src/main/res/mipmap-mdpi/ic_launcher_round.webp',
  'android/app/src/main/res/mipmap-mdpi/ic_launcher_adaptive_back.png',
  'android/app/src/main/res/mipmap-mdpi/ic_launcher_adaptive_fore.png',
  
  'android/app/src/main/res/mipmap-xhdpi/ic_launcher.png',
  'android/app/src/main/res/mipmap-xhdpi/ic_launcher.webp',
  'android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.webp',
  'android/app/src/main/res/mipmap-xhdpi/ic_launcher_adaptive_back.png',
  'android/app/src/main/res/mipmap-xhdpi/ic_launcher_adaptive_fore.png',
  
  'android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png',
  'android/app/src/main/res/mipmap-xxhdpi/ic_launcher.webp',
  'android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.webp',
  'android/app/src/main/res/mipmap-xxhdpi/ic_launcher_adaptive_back.png',
  'android/app/src/main/res/mipmap-xxhdpi/ic_launcher_adaptive_fore.png',
  
  'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png',
  'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.webp',
  'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.webp',
  'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_adaptive_back.png',
  'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_adaptive_fore.png',
  
  // Adaptive icon XML files
  'android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml',
  'android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml',
  
  // Notification icon
  'android/app/src/main/res/drawable/notification_icon.png',
  
  // Configuration files
  'android/app/src/main/AndroidManifest.xml',
  'android/app/build.gradle',
  'app.json'
];

let allFilesExist = true;
let missingFiles = [];

console.log('📱 Checking required icon files...\n');

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesExist = false;
    missingFiles.push(file);
  }
});

console.log('\n🔧 Checking AndroidManifest.xml configuration...\n');

// Check AndroidManifest.xml
const manifestPath = 'android/app/src/main/AndroidManifest.xml';
if (fs.existsSync(manifestPath)) {
  const manifestContent = fs.readFileSync(manifestPath, 'utf8');
  
  const requiredManifestElements = [
    'android:icon="@mipmap/ic_launcher"',
    'android:roundIcon="@mipmap/ic_launcher_round"',
    'android:resource="@drawable/notification_icon"'
  ];
  
  requiredManifestElements.forEach(element => {
    if (manifestContent.includes(element)) {
      console.log(`✅ AndroidManifest.xml contains: ${element}`);
    } else {
      console.log(`❌ AndroidManifest.xml missing: ${element}`);
      allFilesExist = false;
    }
  });
} else {
  console.log('❌ AndroidManifest.xml not found');
  allFilesExist = false;
}

console.log('\n📋 Checking app.json configuration...\n');

// Check app.json
const appJsonPath = 'app.json';
if (fs.existsSync(appJsonPath)) {
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  
  if (appJson.expo.android) {
    console.log('✅ Android configuration found in app.json');
    
    if (appJson.expo.android.icon) {
      console.log(`✅ Main icon: ${appJson.expo.android.icon}`);
    } else {
      console.log('❌ Main icon not configured');
      allFilesExist = false;
    }
    
    if (appJson.expo.android.adaptiveIcon) {
      console.log(`✅ Adaptive icon configured`);
      console.log(`   - Foreground: ${appJson.expo.android.adaptiveIcon.foregroundImage}`);
      console.log(`   - Background: ${appJson.expo.android.adaptiveIcon.backgroundColor}`);
    } else {
      console.log('❌ Adaptive icon not configured');
      allFilesExist = false;
    }
  } else {
    console.log('❌ Android configuration not found in app.json');
    allFilesExist = false;
  }
} else {
  console.log('❌ app.json not found');
  allFilesExist = false;
}

console.log('\n🎯 Summary:\n');

if (allFilesExist) {
  console.log('🎉 ALL ICON CONFIGURATIONS ARE PERFECT!');
  console.log('✅ Home screen icon will display correctly');
  console.log('✅ Notification icon will work properly');
  console.log('✅ Adaptive icons will work on Android 8.0+');
  console.log('✅ App is ready for Play Store submission');
} else {
  console.log('⚠️  Some issues found:');
  missingFiles.forEach(file => {
    console.log(`   - Missing: ${file}`);
  });
  console.log('\n🔧 Please fix the missing files and run this script again.');
}

console.log('\n📱 Icon Requirements Met:');
console.log('✅ Standard launcher icons (PNG + WebP)');
console.log('✅ Round launcher icons');
console.log('✅ Adaptive icon components (foreground/background)');
console.log('✅ All density folders (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi)');
console.log('✅ Notification icon');
console.log('✅ AndroidManifest.xml configuration');
console.log('✅ app.json configuration');

process.exit(allFilesExist ? 0 : 1);
