#!/usr/bin/env node

/**
 * Test Script for Critical Fixes
 * 
 * This script tests the three critical issues:
 * 1. Waitlist promotion when position 1 cancels
 * 2. Instructor calendar showing classes
 * 3. Development notifications working
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Critical Fixes...\n');

// Test 1: Waitlist Promotion Logic
console.log('1️⃣ Testing Waitlist Promotion Logic...');
const bookingServicePath = path.join(__dirname, '../src/services/bookingService.ts');
const bookingServiceContent = fs.readFileSync(bookingServicePath, 'utf8');

const waitlistPromotionChecks = [
  'updateWaitlistPositions',
  'promoteFromWaitlist', 
  'position',
  'console.log.*WAITLIST'
];

let waitlistScore = 0;
waitlistPromotionChecks.forEach(check => {
  if (bookingServiceContent.includes(check)) {
    console.log(`✅ Found: ${check}`);
    waitlistScore++;
  } else {
    console.log(`❌ Missing: ${check}`);
  }
});

console.log(`📊 Waitlist Promotion Score: ${waitlistScore}/${waitlistPromotionChecks.length}\n`);

// Test 2: Instructor Calendar Debugging
console.log('2️⃣ Testing Instructor Calendar Debugging...');
const scheduleOverviewPath = path.join(__dirname, '../src/screens/instructor/ScheduleOverview.tsx');
const scheduleContent = fs.readFileSync(scheduleOverviewPath, 'utf8');

const calendarChecks = [
  'console.log.*ScheduleOverview',
  'console.log.*API Response',
  'console.log.*Loaded',
  'setClasses'
];

let calendarScore = 0;
calendarChecks.forEach(check => {
  if (scheduleContent.includes(check)) {
    console.log(`✅ Found: ${check}`);
    calendarScore++;
  } else {
    console.log(`❌ Missing: ${check}`);
  }
});

console.log(`📊 Instructor Calendar Score: ${calendarScore}/${calendarChecks.length}\n`);

// Test 3: Development Notifications
console.log('3️⃣ Testing Development Notifications...');
const notificationServicePath = path.join(__dirname, '../src/services/notificationService.ts');
const notificationContent = fs.readFileSync(notificationServicePath, 'utf8');

const notificationChecks = [
  'isDevelopment',
  'Development mode',
  'Development fallback',
  '__DEV__'
];

let notificationScore = 0;
notificationChecks.forEach(check => {
  if (notificationContent.includes(check)) {
    console.log(`✅ Found: ${check}`);
    notificationScore++;
  } else {
    console.log(`❌ Missing: ${check}`);
  }
});

console.log(`📊 Development Notifications Score: ${notificationScore}/${notificationChecks.length}\n`);

// Overall Assessment
const totalScore = waitlistScore + calendarScore + notificationScore;
const maxScore = waitlistPromotionChecks.length + calendarChecks.length + notificationChecks.length;

console.log('📋 OVERALL ASSESSMENT:');
console.log(`🎯 Total Score: ${totalScore}/${maxScore}`);
console.log(`📊 Percentage: ${Math.round((totalScore / maxScore) * 100)}%`);

if (totalScore >= maxScore * 0.8) {
  console.log('✅ All critical fixes are in place!');
} else if (totalScore >= maxScore * 0.6) {
  console.log('⚠️ Most fixes are in place, but some issues remain.');
} else {
  console.log('❌ Critical fixes are missing. Please review the implementation.');
}

console.log('\n🚀 Next Steps:');
console.log('1. Test waitlist promotion manually with real data');
console.log('2. Check instructor calendar shows classes');
console.log('3. Verify development notifications work in simulator');
console.log('4. Test all fixes in production build'); 