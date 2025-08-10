// Example: How to use bulk notifications for 500+ users

import { notificationService } from './src/services/notificationService';

// Example 1: Send to multiple specific users
async function notifyClassCancellation() {
  const userIds = [
    'user1-uuid',
    'user2-uuid', 
    'user3-uuid'
    // ... up to 500+ users
  ];
  
  await notificationService.sendNotificationToMultipleUsers(
    userIds,
    'Class Cancelled',
    'Your Pilates class has been cancelled'
  );
}

// Example 2: Send to all users with push tokens
async function sendGeneralAnnouncement() {
  // Get all users from Supabase
  const { data: users } = await supabase
    .from('users')
    .select('id')
    .not('push_token', 'is', null);
  
  if (users) {
    const userIds = users.map(u => u.id);
    
    await notificationService.sendNotificationToMultipleUsers(
      userIds,
      'Studio Update',
      'New classes added this week!'
    );
  }
}

// Example 3: Send to all instructors
async function notifyAllInstructors() {
  const { data: instructors } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'instructor')
    .not('push_token', 'is', null);
  
  if (instructors) {
    const instructorIds = instructors.map(i => i.id);
    
    await notificationService.sendNotificationToMultipleUsers(
      instructorIds,
      'Instructor Notice',
      'Please check the new schedule updates'
    );
  }
}

// Example 4: Performance with 500 users
/*
For 500 users:
- Old way: 500 individual API calls = ~30-60 seconds
- New way: 5 batch calls (100 each) = ~2-5 seconds ✅

The system automatically:
- Splits into 100-token batches (Expo's limit)
- Adds delays between batches to avoid rate limiting  
- Logs success/failure counts for monitoring
- Handles individual token failures gracefully
*/