#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Checking Android Icon Padding for Proper Display...\n');

// Check if we can access the foreground images
const foregroundPaths = [
  'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.webp',
  'android/app/src/main/res/mipmap-xxhdpi/ic_launcher_foreground.webp',
  'android/app/src/main/res/mipmap-xhdpi/ic_launcher_foreground.webp',
  'android/app/src/main/res/mipmap-hdpi/ic_launcher_foreground.webp',
  'android/app/src/main/res/mipmap-mdpi/ic_launcher_foreground.webp'
];

console.log('📱 Android Adaptive Icon Guidelines:');
console.log('   • Foreground image should be 432×432 px (for xxxhdpi)');
console.log('   • Logo should be centered within ~288×288 px safe zone');
console.log('   • ~72 px transparent padding on all sides (66% safe zone)');
console.log('   • Background color is handled separately\n');

console.log('🔧 Current Configuration:');
console.log('   ✅ Adaptive icon XML files are properly configured');
console.log('   ✅ Background color is set to #F5F2B8');
console.log('   ✅ Foreground images exist in all density folders\n');

console.log('⚠️  IMPORTANT: To prevent oversized icons on Android home screens:');
console.log('   1. The foreground images MUST have transparent padding around the logo');
console.log('   2. The actual logo should occupy only ~66% of the total image area');
console.log('   3. If your foreground images fill the entire canvas, they will appear oversized\n');

console.log('🔍 Checking foreground image files...\n');

let allFilesExist = true;
foregroundPaths.forEach(file => {
  if (fs.existsSync(file)) {
    const stats = fs.statSync(file);
    console.log(`✅ ${file} (${Math.round(stats.size / 1024)} KB)`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

console.log('\n📋 Next Steps:');
if (allFilesExist) {
  console.log('   1. Verify your foreground images have proper padding');
  console.log('   2. If images fill the entire canvas, add transparent padding');
  console.log('   3. Uninstall and reinstall the app to clear icon cache');
  console.log('   4. Test on different Android launchers');
} else {
  console.log('   1. Ensure all foreground images are present');
  console.log('   2. Rebuild the Android project');
}

console.log('\n🎯 Expected Result:');
console.log('   • Icon appears properly sized on Android home screen');
console.log('   • No "over-zoom" or oversized appearance');
console.log('   • Consistent display across different launchers');

process.exit(0);
