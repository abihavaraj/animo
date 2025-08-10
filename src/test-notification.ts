import { supabaseNotificationService } from './services/supabaseNotificationService';

async function testNotification() {
  try {
    console.log('🧪 Testing Supabase notification system...');
    
    // Test subscription assignment notification
    await supabaseNotificationService.createSubscriptionAssignmentNotification(
      '0c6754c3-1c84-438a-8b56-f8a6a3f44fcc', // argjend user ID
      'Basic Plan',
      'Reception Staff'
    );
    
    console.log('✅ Test notification sent successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testNotification(); 