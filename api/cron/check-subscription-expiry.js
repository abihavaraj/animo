// Vercel Edge Function to check and send subscription expiry notifications
// This runs as a daily cron job to notify users about expiring/expired subscriptions

import { createClient } from '@supabase/supabase-js';
const { getTranslatedNotification, getUserLanguage } = require('../utils/notificationTranslator');

// Initialize Supabase client
const supabase = createClient(
  'https://byhqueksdwlbiwodpbbd.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5aHF1ZWtzZHdsYml3b2RwYmJkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mjg2MDQ3OCwiZXhwIjoyMDY4NDM2NDc4fQ.AaWY'
);

export default async function handler(req, res) {
  console.log('🔔 [subscription-expiry] Starting subscription expiry check...');
  
  try {
    const results = {
      expiringNotifications: 0,
      expiredNotifications: 0,
      errors: []
    };

    // Check for subscriptions expiring in the next 7 days
    await checkExpiringSubscriptions(results);
    
    // Check for subscriptions that expired today
    await checkExpiredSubscriptions(results);

    console.log('✅ [subscription-expiry] Subscription expiry check completed:', results);
    
    res.status(200).json({
      success: true,
      message: 'Subscription expiry notifications processed',
      results
    });

  } catch (error) {
    console.error('❌ [subscription-expiry] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

async function checkExpiringSubscriptions(results) {
  try {
    console.log('🔍 [subscription-expiry] Checking expiring subscriptions...');
    
    // Get subscriptions expiring in the next 7 days
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    const { data: expiringSubscriptions, error } = await supabase
      .from('user_subscriptions')
      .select(`
        user_id,
        expiry_date,
        subscription_plans (name),
        users (language_preference)
      `)
      .eq('status', 'active')
      .lte('expiry_date', sevenDaysFromNow.toISOString())
      .gt('expiry_date', new Date().toISOString());

    if (error) {
      console.error('❌ [subscription-expiry] Error fetching expiring subscriptions:', error);
      results.errors.push(`Expiring subscriptions: ${error.message}`);
      return;
    }

    if (!expiringSubscriptions || expiringSubscriptions.length === 0) {
      console.log('ℹ️ [subscription-expiry] No expiring subscriptions found');
      return;
    }

    console.log(`📢 [subscription-expiry] Found ${expiringSubscriptions.length} expiring subscriptions`);

    // Create notifications for each expiring subscription
    for (const subscription of expiringSubscriptions) {
      try {
        const userLanguage = subscription.users?.language_preference || 'en';
        const expiryDate = new Date(subscription.expiry_date).toLocaleDateString();
        const planName = subscription.subscription_plans?.name || 'Subscription';
        
        const { title, body } = getTranslatedNotification(
          'subscription_expiring',
          {
            planName: planName,
            expiryDate: expiryDate
          },
          userLanguage
        );

        // Insert notification into database
        const { error: insertError } = await supabase
          .from('notifications')
          .insert({
            user_id: subscription.user_id,
            type: 'subscription_expiring',
            title: title,
            message: body,
            scheduled_for: new Date().toISOString(),
            metadata: { 
              language: userLanguage,
              subscription_plan: planName,
              expiry_date: expiryDate
            },
            is_read: false
          });

        if (insertError) {
          console.error(`❌ [subscription-expiry] Failed to create expiring notification for user ${subscription.user_id}:`, insertError);
          results.errors.push(`Expiring notification for ${subscription.user_id}: ${insertError.message}`);
        } else {
          results.expiringNotifications++;
          console.log(`✅ [subscription-expiry] Created expiring notification for user ${subscription.user_id} (${userLanguage})`);
        }
      } catch (notificationError) {
        console.error(`❌ [subscription-expiry] Error creating expiring notification for user ${subscription.user_id}:`, notificationError);
        results.errors.push(`Expiring notification for ${subscription.user_id}: ${notificationError.message}`);
      }
    }
  } catch (error) {
    console.error('❌ [subscription-expiry] Error in checkExpiringSubscriptions:', error);
    results.errors.push(`Expiring subscriptions check: ${error.message}`);
  }
}

async function checkExpiredSubscriptions(results) {
  try {
    console.log('🔍 [subscription-expiry] Checking expired subscriptions...');
    
    // Get subscriptions that expired in the last 24 hours
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const { data: expiredSubscriptions, error } = await supabase
      .from('user_subscriptions')
      .select(`
        user_id,
        expiry_date,
        subscription_plans (name),
        users (language_preference)
      `)
      .eq('status', 'active')
      .gte('expiry_date', yesterday.toISOString())
      .lt('expiry_date', now.toISOString());

    if (error) {
      console.error('❌ [subscription-expiry] Error fetching expired subscriptions:', error);
      results.errors.push(`Expired subscriptions: ${error.message}`);
      return;
    }

    if (!expiredSubscriptions || expiredSubscriptions.length === 0) {
      console.log('ℹ️ [subscription-expiry] No expired subscriptions found');
      return;
    }

    console.log(`📢 [subscription-expiry] Found ${expiredSubscriptions.length} expired subscriptions`);

    // Create notifications for each expired subscription
    for (const subscription of expiredSubscriptions) {
      try {
        const userLanguage = subscription.users?.language_preference || 'en';
        const planName = subscription.subscription_plans?.name || 'Subscription';
        
        const { title, body } = getTranslatedNotification(
          'subscription_expired',
          {
            planName: planName
          },
          userLanguage
        );

        // Insert notification into database
        const { error: insertError } = await supabase
          .from('notifications')
          .insert({
            user_id: subscription.user_id,
            type: 'subscription_expired',
            title: title,
            message: body,
            scheduled_for: new Date().toISOString(),
            metadata: { 
              language: userLanguage,
              subscription_plan: planName
            },
            is_read: false
          });

        if (insertError) {
          console.error(`❌ [subscription-expiry] Failed to create expired notification for user ${subscription.user_id}:`, insertError);
          results.errors.push(`Expired notification for ${subscription.user_id}: ${insertError.message}`);
        } else {
          results.expiredNotifications++;
          console.log(`✅ [subscription-expiry] Created expired notification for user ${subscription.user_id} (${userLanguage})`);
        }
      } catch (notificationError) {
        console.error(`❌ [subscription-expiry] Error creating expired notification for user ${subscription.user_id}:`, notificationError);
        results.errors.push(`Expired notification for ${subscription.user_id}: ${notificationError.message}`);
      }
    }
  } catch (error) {
    console.error('❌ [subscription-expiry] Error in checkExpiredSubscriptions:', error);
    results.errors.push(`Expired subscriptions check: ${error.message}`);
  }
}
