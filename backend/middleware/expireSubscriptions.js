const db = require('../config/database');

// Middleware to automatically expire old subscriptions before processing requests
const expireSubscriptions = async (req, res, next) => {
  try {
    // TEMPORARY: Skip for Supabase due to RLS policy issues
    if (db.useSupabase) {
      console.log('⚠️ Skipping expireSubscriptions for Supabase due to RLS policy issues');
      next();
      return;
    }
    
    // Run this for any endpoint that might check subscription status
    const needsSubscriptionCheck = (
      req.path.includes('/subscriptions') ||
      req.path.includes('/users') ||
      req.path.includes('/bookings') ||
      req.path.includes('/classes') ||
      req.path.includes('/profile') ||
      req.method === 'GET' // Most GET requests might need subscription info
    );
    
    if (needsSubscriptionCheck && !db.useSupabase) {
      // Original SQLite logic
      const result = await db.run(`
        UPDATE user_subscriptions 
        SET status = 'expired', updated_at = CURRENT_TIMESTAMP 
        WHERE status = 'active' AND DATE(end_date) <= DATE('now')
      `);
      
      if (result.changes > 0) {
        console.log(`🔄 Auto-expired ${result.changes} subscriptions`);
      }
    }
    
    next();
  } catch (error) {
    console.error('Error in expireSubscriptions middleware:', error);
    // Don't fail the request if this middleware has issues
    next();
  }
};

module.exports = expireSubscriptions; 