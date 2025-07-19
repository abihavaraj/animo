const express = require('express');
const { body, validationResult } = require('express-validator');
const moment = require('moment');
const db = require('../config/database');
const { authenticateToken, requireAdmin, requireAdminOrReception, requireOwnershipOrAdmin } = require('../middleware/auth');
const subscriptionNotificationService = require('../services/subscriptionNotificationService');

const router = express.Router();

// Helper function to update expired subscriptions
async function updateExpiredSubscriptions() {
  try {
    const today = moment().format('YYYY-MM-DD');
    
    const result = await db.run(
      'UPDATE user_subscriptions SET status = "expired" WHERE DATE(end_date) < ? AND status = "active"',
      [today]
    );

    if (result.changes > 0) {
      console.log(`🔄 Auto-updated ${result.changes} expired subscriptions`);
    }
  } catch (error) {
    console.error('Error updating expired subscriptions:', error);
  }
}

// GET /api/subscriptions - Get user subscriptions
router.get('/', authenticateToken, async (req, res) => {
  try {
    // First, update any expired subscriptions
    await updateExpiredSubscriptions();
    
    const { userId, status } = req.query;
    
    let query = `
      SELECT 
        us.*,
        sp.name as plan_name,
        sp.equipment_access,
        sp.monthly_price,
        sp.category,
        sp.duration_months,
        u.name as user_name,
        u.email as user_email,
        CASE 
          WHEN DATE(us.end_date) < DATE('now') AND us.status = 'active' THEN 'expired'
          ELSE us.status
        END as actual_status
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      JOIN users u ON us.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];

    // If user is not admin, only show their own subscriptions
    if (req.user.role !== 'admin' && req.user.role !== 'reception') {
      query += ' AND us.user_id = ?';
      params.push(req.user.id);
    } else if (userId) {
      query += ' AND us.user_id = ?';
      params.push(userId);
    }

    if (status) {
      query += ' AND us.status = ?';
      params.push(status);
    }

    query += ' ORDER BY us.created_at DESC';

    const subscriptions = await db.all(query, params);

    // Update the status field to reflect actual status
    const updatedSubscriptions = subscriptions.map(sub => ({
      ...sub,
      status: sub.actual_status
    }));

    res.json({
      success: true,
      data: updatedSubscriptions
    });

  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/subscriptions/current - Get user's current active subscription
router.get('/current', authenticateToken, async (req, res) => {
  try {
    // First, update any expired subscriptions
    await updateExpiredSubscriptions();
    
    const subscription = await db.get(`
      SELECT 
        us.*,
        sp.name as plan_name,
        sp.equipment_access,
        sp.monthly_price,
        sp.monthly_classes,
        sp.category,
        sp.features,
        sp.duration_months
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.user_id = ? 
        AND (us.status = 'active' OR (us.status = 'cancelled' AND us.remaining_classes > 0))
        AND DATE(us.end_date) >= DATE('now')
      ORDER BY us.created_at DESC
      LIMIT 1
    `, [req.user.id]);

    if (subscription && subscription.features) {
      subscription.features = JSON.parse(subscription.features);
    }

    res.json({
      success: true,
      data: subscription || null
    });

  } catch (error) {
    console.error('Get current subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/subscriptions/:id - Get single subscription
router.get('/:id', authenticateToken, requireOwnershipOrAdmin, async (req, res) => {
  try {
    const subscription = await db.get(`
      SELECT 
        us.*,
        sp.name as plan_name,
        sp.equipment_access,
        sp.monthly_price,
        sp.category,
        sp.features,
        u.name as user_name,
        u.email as user_email
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      JOIN users u ON us.user_id = u.id
      WHERE us.id = ?
    `, [req.params.id]);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    if (subscription.features) {
      subscription.features = JSON.parse(subscription.features);
    }
rr
    res.json({
      success: true,
      data: subscription
    });

  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/subscriptions/purchase - Purchase new subscription
router.post('/purchase', authenticateToken, [
  body('planId').isInt({ min: 1 }).withMessage('Valid plan ID is required'),
  body('paymentMethod').optional().isString().withMessage('Payment method must be string'),
  body('useCredit').optional().isBoolean().withMessage('Use credit must be boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { planId, paymentMethod = 'credit', useCredit = true } = req.body;

    // Get the plan
    const plan = await db.get('SELECT * FROM subscription_plans WHERE id = ? AND is_active = 1', [planId]);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found or inactive'
      });
    }

    // Always check credit balance - subscriptions require credit payment
    const user = await db.get('SELECT credit_balance FROM users WHERE id = ?', [req.user.id]);
    if (!user || (user.credit_balance || 0) < plan.monthly_price) {
      return res.status(400).json({
        success: false,
        message: `Insufficient credit balance. Required: $${plan.monthly_price}, Available: $${user?.credit_balance || 0}. Please add credits to your account before purchasing a subscription.`
      });
    }

    // Check if user already has an active subscription
    const existingSubscription = await db.get(
      'SELECT id FROM user_subscriptions WHERE user_id = ? AND status = "active"',
      [req.user.id]
    );

    // Start transaction
    await db.run('BEGIN TRANSACTION');

    try {
      // If user has an existing active subscription, cancel it first
      if (existingSubscription) {
        await db.run(
          'UPDATE user_subscriptions SET status = "cancelled", remaining_classes = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [existingSubscription.id]
        );
        console.log(`Cancelled existing subscription ${existingSubscription.id} for user ${req.user.id}`);
        
        // Log the cancellation activity
        await db.run(`
          INSERT INTO client_activity_log (
            client_id, activity_type, description, performed_by
          ) VALUES (?, ?, ?, ?)
        `, [
          req.user.id,
          'subscription_cancellation',
          `Previous subscription cancelled to start new subscription. ${existingSubscription.remaining_classes > 0 ? `${existingSubscription.remaining_classes} remaining classes cleared.` : ''}`,
          req.user.id
        ]);
      }

      // Calculate start and end dates
      const startDate = moment().format('YYYY-MM-DD');
      // For fractional months less than 1, convert to days for more accurate calculation
      const endDate = plan.duration_months < 1 ? 
        moment().add(Math.max(1, Math.round(plan.duration_months * 30.44)), 'days').format('YYYY-MM-DD') :
        moment().add(plan.duration_months, 'months').format('YYYY-MM-DD');

      // Create subscription
      const subscriptionResult = await db.run(`
        INSERT INTO user_subscriptions (
          user_id, plan_id, remaining_classes, start_date, end_date
        ) VALUES (?, ?, ?, ?, ?)
      `, [req.user.id, planId, plan.monthly_classes, startDate, endDate]);

      // Always use credit for subscription purchases
      const actualPaymentMethod = 'credit';
      
      // Deduct credit from user's balance
      await db.run(`
        UPDATE users 
        SET credit_balance = COALESCE(credit_balance, 0) - ?
        WHERE id = ?
      `, [plan.monthly_price, req.user.id]);

      // Record the credit usage in manual_credits table
      await db.run(`
        INSERT INTO manual_credits (
          user_id, admin_id, amount, classes_added, reason, description, created_at
        ) VALUES (?, ?, ?, 0, 'subscription_purchase', ?, datetime('now'))
      `, [
        req.user.id, 
        req.user.id, 
        -plan.monthly_price, 
        `Credit used for ${plan.name} subscription`
      ]);

      console.log(`💳 Used $${plan.monthly_price} credit for subscription purchase by user ${req.user.id}`);

      // Create payment record
      await db.run(`
        INSERT INTO payments (
          user_id, subscription_id, amount, payment_date, payment_method
        ) VALUES (?, ?, ?, ?, ?)
      `, [req.user.id, subscriptionResult.id, plan.monthly_price, startDate, actualPaymentMethod]);

      // Commit transaction
      await db.run('COMMIT');

      // Get the created subscription with plan details and updated user balance
      const newSubscription = await db.get(`
        SELECT 
          us.*,
          sp.name as plan_name,
          sp.equipment_access,
          sp.monthly_price,
          sp.category
        FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE us.id = ?
      `, [subscriptionResult.id]);

      // Get updated user balance (always needed since credit is always used)
      const updatedUser = await db.get('SELECT credit_balance FROM users WHERE id = ?', [req.user.id]);
      const updatedBalance = updatedUser?.credit_balance || 0;

      const message = existingSubscription ? 
        'Subscription upgraded successfully' : 
        'Subscription purchased successfully';

      const responseData = {
        subscription: newSubscription,
        credit_used: plan.monthly_price,
        remaining_credit_balance: updatedBalance
      };

      res.status(201).json({
        success: true,
        message: message,
        data: responseData
      });

    } catch (transactionError) {
      await db.run('ROLLBACK');
      throw transactionError;
    }

  } catch (error) {
    console.error('Purchase subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// PUT /api/subscriptions/:id/cancel - Cancel subscription
router.put('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const { reason = 'User requested cancellation' } = req.body;
    
    const subscription = await db.get(
      'SELECT * FROM user_subscriptions WHERE id = ?',
      [req.params.id]
    );

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    // Check if user owns this subscription or is admin/reception
    if (req.user.role !== 'admin' && req.user.role !== 'reception' && subscription.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (subscription.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Subscription is already cancelled'
      });
    }

    await db.run(
      'UPDATE user_subscriptions SET status = "cancelled", remaining_classes = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [req.params.id]
    );

    // Log the cancellation activity
    await db.run(`
      INSERT INTO client_activity_log (
        client_id, activity_type, description, performed_by
      ) VALUES (?, ?, ?, ?)
    `, [
      subscription.user_id,
      'subscription_cancellation',
      `Subscription cancelled by ${req.user.role}. ${subscription.remaining_classes > 0 ? `${subscription.remaining_classes} remaining classes cleared.` : ''} Reason: ${reason}`,
      req.user.id
    ]);

    // Create notification for the user if cancelled by admin/reception (not self-cancellation)
    if (req.user.role === 'admin' || req.user.role === 'reception') {
      await subscriptionNotificationService.createSubscriptionChangeNotification(
        subscription.user_id,
        'cancelled',
        `Reason: ${reason}`,
        req.user.id
      );
    }

    // Cancel any scheduled notifications for future bookings from this subscription
    try {
      await db.run(`
        DELETE FROM notifications 
        WHERE user_id = ? AND sent = 0 AND class_id IN (
          SELECT b.class_id FROM bookings b 
          WHERE b.subscription_id = ? AND b.status = 'confirmed'
        )
      `, [subscription.user_id, req.params.id]);
      
      console.log(`📱 Cancelled scheduled notifications for cancelled subscription ${req.params.id}`);
    } catch (notificationError) {
      console.error('Error cancelling notifications for cancelled subscription:', notificationError);
      // Don't fail subscription cancellation if notification cleanup fails
    }

    res.json({
      success: true,
      message: 'Subscription cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// PUT /api/subscriptions/:id/pause - Pause subscription (Admin/Reception only)
router.put('/:id/pause', authenticateToken, requireAdminOrReception, [
  body('pauseDays').optional().isInt({ min: 1, max: 365 }).withMessage('Pause days must be between 1 and 365'),
  body('reason').optional().isString().withMessage('Reason must be a string')
], async (req, res) => {
  try {
    const { pauseDays = 30, reason = 'Administrative pause' } = req.body;
    
    const subscription = await db.get(
      'SELECT * FROM user_subscriptions WHERE id = ?',
      [req.params.id]
    );

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    if (subscription.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Only active subscriptions can be paused'
      });
    }

    // Calculate new end date by extending it by pause days
    const currentEndDate = moment(subscription.end_date);
    const newEndDate = currentEndDate.add(pauseDays, 'days').format('YYYY-MM-DD');

    await db.run(`
      UPDATE user_subscriptions 
      SET status = 'paused', end_date = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, [newEndDate, req.params.id]);

    // Log the pause activity
    await db.run(`
      INSERT INTO client_activity_log (
        client_id, activity_type, description, performed_by
      ) VALUES (?, ?, ?, ?)
    `, [
      subscription.user_id,
      'subscription_paused',
      `Subscription paused for ${pauseDays} days by ${req.user.name} (${req.user.role}). Reason: ${reason}. New end date: ${newEndDate}`,
      req.user.id
    ]);

    // Create notification for the user
    await subscriptionNotificationService.createSubscriptionChangeNotification(
      subscription.user_id,
      'paused',
      `Paused for ${pauseDays} days. End date extended to: ${newEndDate}`,
      req.user.id
    );

    res.json({
      success: true,
      message: `Subscription paused for ${pauseDays} days successfully`,
      data: {
        pauseDays,
        newEndDate,
        reason
      }
    });

  } catch (error) {
    console.error('Pause subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// PUT /api/subscriptions/:id/resume - Resume paused subscription (Admin/Reception only)
router.put('/:id/resume', authenticateToken, requireAdminOrReception, [
  body('reason').optional().isString().withMessage('Reason must be a string')
], async (req, res) => {
  try {
    const { reason = 'Administrative resume' } = req.body;
    
    const subscription = await db.get(
      'SELECT * FROM user_subscriptions WHERE id = ?',
      [req.params.id]
    );

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    if (subscription.status !== 'paused') {
      return res.status(400).json({
        success: false,
        message: 'Only paused subscriptions can be resumed'
      });
    }

    await db.run(
      'UPDATE user_subscriptions SET status = "active", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [req.params.id]
    );

    // Log the resume activity
    await db.run(`
      INSERT INTO client_activity_log (
        client_id, activity_type, description, performed_by
      ) VALUES (?, ?, ?, ?)
    `, [
      subscription.user_id,
      'subscription_resumed',
      `Subscription resumed by ${req.user.name} (${req.user.role}). Reason: ${reason}`,
      req.user.id
    ]);

    // Create notification for the user
    await subscriptionNotificationService.createSubscriptionChangeNotification(
      subscription.user_id,
      'resumed',
      `Your subscription has been resumed.`,
      req.user.id
    );

    res.json({
      success: true,
      message: 'Subscription resumed successfully'
    });

  } catch (error) {
    console.error('Resume subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// PUT /api/subscriptions/:id/extend - Extend subscription (Admin/Reception only)
router.put('/:id/extend', authenticateToken, requireAdminOrReception, [
  body('extensionDays').isInt({ min: 1, max: 365 }).withMessage('Extension days must be between 1 and 365'),
  body('reason').optional().isString().withMessage('Reason must be a string')
], async (req, res) => {
  try {
    const { extensionDays, reason = 'Administrative extension' } = req.body;
    
    const subscription = await db.get(
      'SELECT * FROM user_subscriptions WHERE id = ?',
      [req.params.id]
    );

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    if (subscription.status !== 'active' && subscription.status !== 'paused') {
      return res.status(400).json({
        success: false,
        message: 'Only active or paused subscriptions can be extended'
      });
    }

    // Calculate new end date
    const currentEndDate = moment(subscription.end_date);
    const newEndDate = currentEndDate.add(extensionDays, 'days').format('YYYY-MM-DD');

    await db.run(`
      UPDATE user_subscriptions 
      SET end_date = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, [newEndDate, req.params.id]);

    // Log the extension activity
    await db.run(`
      INSERT INTO client_activity_log (
        client_id, activity_type, description, performed_by
      ) VALUES (?, ?, ?, ?)
    `, [
      subscription.user_id,
      'subscription_extended',
      `Subscription extended by ${extensionDays} days by ${req.user.name} (${req.user.role}). Reason: ${reason}. New end date: ${newEndDate}`,
      req.user.id
    ]);

    // Create notification for the user
    await subscriptionNotificationService.createSubscriptionChangeNotification(
      subscription.user_id,
      'extended',
      `Extended by ${extensionDays} days. New end date: ${newEndDate}`,
      req.user.id
    );

    res.json({
      success: true,
      message: `Subscription extended by ${extensionDays} days successfully`,
      data: {
        extensionDays,
        newEndDate,
        reason
      }
    });

  } catch (error) {
    console.error('Extend subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/subscriptions/check-existing - Check if user has existing subscription before assigning
router.post('/check-existing', authenticateToken, requireAdminOrReception, [
  body('userId').isInt({ min: 1 }).withMessage('Valid user ID is required'),
  body('planId').isInt({ min: 1 }).withMessage('Valid plan ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { userId, planId } = req.body;

    // Get the new plan
    const newPlan = await db.get('SELECT * FROM subscription_plans WHERE id = ? AND is_active = 1', [planId]);
    if (!newPlan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found or inactive'
      });
    }

    // Get the user
    const user = await db.get('SELECT name, email FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user has existing active subscription
    const existingSubscription = await db.get(`
      SELECT 
        us.*,
        sp.name as plan_name,
        sp.monthly_price,
        sp.monthly_classes,
        sp.equipment_access
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.user_id = ? AND us.status = 'active' AND DATE(us.end_date) > DATE('now')
      ORDER BY us.created_at DESC
      LIMIT 1
    `, [userId]);

    if (!existingSubscription) {
      // No existing subscription, safe to proceed
      return res.json({
        success: true,
        data: {
          hasExistingSubscription: false,
          canProceed: true,
          user: user,
          newPlan: newPlan,
          message: 'No existing subscription found. Safe to assign new subscription.'
        }
      });
    }

    // Calculate days remaining and classes remaining
    const endDate = moment(existingSubscription.end_date);
    const today = moment();
    const daysRemaining = Math.max(0, endDate.diff(today, 'days'));
    const classesRemaining = existingSubscription.remaining_classes || 0;

    // Calculate potential refund (pro-rated)
    const totalDays = moment(existingSubscription.end_date).diff(moment(existingSubscription.start_date), 'days');
    const refundAmount = totalDays > 0 ? (daysRemaining / totalDays) * existingSubscription.monthly_price : 0;

    // Analyze plan comparison
    const isUpgrade = newPlan.monthly_price > existingSubscription.monthly_price;
    const isDowngrade = newPlan.monthly_price < existingSubscription.monthly_price;
    const isSamePlan = newPlan.id === existingSubscription.plan_id;

    // Provide options based on situation
    const options = [
      {
        id: 'replace',
        name: 'Replace Current Subscription',
        description: `Cancel existing "${existingSubscription.plan_name}" and start new "${newPlan.name}" immediately`,
        warning: `Client will lose ${classesRemaining} remaining classes and ${daysRemaining} days`,
        refundAmount: refundAmount,
        recommended: isUpgrade
      },
      {
        id: 'queue',
        name: 'Queue for Next Period',
        description: `Start new "${newPlan.name}" when current subscription ends on ${endDate.format('YYYY-MM-DD')}`,
        warning: null,
        refundAmount: 0,
        recommended: true
      },
      {
        id: 'extend',
        name: 'Extend Current Subscription',
        description: `Add ${newPlan.monthly_classes} classes to existing "${existingSubscription.plan_name}" subscription`,
        warning: isDowngrade ? 'This is a downgrade - client will pay less but get fewer benefits' : null,
        refundAmount: 0,
        recommended: !isDowngrade && !isSamePlan
      }
    ];

    res.json({
      success: true,
      data: {
        hasExistingSubscription: true,
        canProceed: false,
        user: user,
        newPlan: newPlan,
        existingSubscription: {
          id: existingSubscription.id,
          planName: existingSubscription.plan_name,
          monthlyPrice: existingSubscription.monthly_price,
          classesRemaining: classesRemaining,
          daysRemaining: daysRemaining,
          endDate: existingSubscription.end_date,
          equipmentAccess: existingSubscription.equipment_access
        },
        comparison: {
          isUpgrade: isUpgrade,
          isDowngrade: isDowngrade,
          isSamePlan: isSamePlan,
          priceDifference: newPlan.monthly_price - existingSubscription.monthly_price,
          classDifference: newPlan.monthly_classes - existingSubscription.monthly_classes
        },
        options: options,
        message: `Client "${user.name}" has an active subscription that ends in ${daysRemaining} days with ${classesRemaining} classes remaining.`
      }
    });

  } catch (error) {
    console.error('Check existing subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/subscriptions/assign - Admin/Reception assign subscription to user
router.post('/assign', authenticateToken, requireAdminOrReception, [
  body('userId').isInt({ min: 1 }).withMessage('Valid user ID is required'),
  body('planId').isInt({ min: 1 }).withMessage('Valid plan ID is required'),
  body('paymentMethod').optional().isString().withMessage('Payment method must be string'),
  body('action').optional().isIn(['new', 'extend']).withMessage('Action must be "new" or "extend"')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { userId, planId, paymentMethod = 'manual', notes = '', action = 'new' } = req.body;

    // Get the plan
    const plan = await db.get('SELECT * FROM subscription_plans WHERE id = ? AND is_active = 1', [planId]);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found or inactive'
      });
    }

    // Get the user
    const user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check for existing active subscription if action is 'new'
    if (action === 'new') {
      const existingActive = await db.get('SELECT id FROM user_subscriptions WHERE user_id = ? AND status = \'active\' AND DATE(end_date) >= DATE(\'now\')', [userId]);
      if (existingActive) {
        return res.status(400).json({ success: false, message: 'User already has an active subscription. Use extend or cancel existing first.' });
      }
    }

    // Check if user already has an active subscription
    const existingSubscription = await db.get(`
      SELECT 
        us.*,
        sp.name as existing_plan_name,
        sp.monthly_price as existing_monthly_price
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.user_id = ? AND us.status = "active" AND DATE(us.end_date) > DATE('now')
    `, [userId]);

    // Start transaction
    await db.run('BEGIN TRANSACTION');

    try {
      let resultSubscription;
      let paymentAmount = 0;
      let operationType = '';

      if (existingSubscription && action === 'extend') {
        // EXTEND EXISTING SUBSCRIPTION
        // Calculate payment amount based on the plan being used for extension
        paymentAmount = plan.monthly_price;
        
        // Add classes to existing subscription
        const newRemainingClasses = existingSubscription.remaining_classes + plan.monthly_classes;
        
        await db.run(`
          UPDATE user_subscriptions 
          SET remaining_classes = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [newRemainingClasses, existingSubscription.id]);

        // Create payment record for the extension
        await db.run(`
          INSERT INTO payments (
            user_id, subscription_id, amount, payment_date, payment_method, status
          ) VALUES (?, ?, ?, ?, ?, 'completed')
        `, [
          userId, 
          existingSubscription.id, 
          paymentAmount, 
          moment().format('YYYY-MM-DD'),
          paymentMethod
        ]);

        // Log activity
        await db.run(`
          INSERT INTO client_activity_log (
            client_id, activity_type, description, performed_by, created_at
          ) VALUES (?, ?, ?, ?, datetime('now'))
        `, [
          userId,
          'subscription_renewal',
          `Subscription extended with ${plan.monthly_classes} classes from ${plan.name} plan by ${req.user.name} (${req.user.role}). Payment: $${paymentAmount}. ${notes}`.trim(),
          req.user.id
        ]);

        // Get updated subscription
        resultSubscription = await db.get(`
          SELECT 
            us.*,
            sp.name as plan_name,
            sp.equipment_access,
            sp.monthly_price,
            sp.monthly_classes,
            sp.category,
            u.name as user_name,
            u.email as user_email
          FROM user_subscriptions us
          JOIN subscription_plans sp ON us.plan_id = sp.id
          JOIN users u ON us.user_id = u.id
          WHERE us.id = ?
        `, [existingSubscription.id]);

        operationType = 'extended';
        console.log(`🎫 Reception extended ${user.name}'s subscription with ${plan.monthly_classes} classes from ${plan.name} plan. Payment: $${paymentAmount}`);

      } else {
        // CREATE NEW SUBSCRIPTION (replace existing if any)
        
        // If user has an existing active subscription, cancel it first
        if (existingSubscription) {
          await db.run(
            'UPDATE user_subscriptions SET status = "cancelled", remaining_classes = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [existingSubscription.id]
          );
          console.log(`🎫 Reception cancelled existing subscription ${existingSubscription.id} for user ${userId}`);
          
          // Log the cancellation activity
          await db.run(`
            INSERT INTO client_activity_log (
              client_id, activity_type, description, performed_by
            ) VALUES (?, ?, ?, ?)
          `, [
            userId,
            'subscription_cancellation',
            `Previous subscription cancelled by ${req.user.role} to assign new subscription. ${existingSubscription.remaining_classes > 0 ? `${existingSubscription.remaining_classes} remaining classes cleared.` : ''}`,
            req.user.id
          ]);
        }

        // Calculate start and end dates
        const startDate = moment().format('YYYY-MM-DD');
        // For fractional months less than 1, convert to days for more accurate calculation
        const endDate = plan.duration_months < 1 ? 
          moment().add(Math.max(1, Math.round(plan.duration_months * 30.44)), 'days').format('YYYY-MM-DD') :
          moment().add(plan.duration_months, 'months').format('YYYY-MM-DD');

        // Create new subscription
        const subscriptionResult = await db.run(`
          INSERT INTO user_subscriptions (
            user_id, plan_id, remaining_classes, start_date, end_date
          ) VALUES (?, ?, ?, ?, ?)
        `, [userId, planId, plan.monthly_classes, startDate, endDate]);

        // For new subscriptions, payment amount is the full plan price
        paymentAmount = plan.monthly_price;

        // Create payment record
        await db.run(`
          INSERT INTO payments (
            user_id, subscription_id, amount, payment_date, payment_method, status
          ) VALUES (?, ?, ?, ?, ?, 'completed')
        `, [
          userId, 
          subscriptionResult.id, 
          paymentAmount, 
          startDate, 
          paymentMethod
        ]);

        // Log activity
        await db.run(`
          INSERT INTO client_activity_log (
            client_id, activity_type, description, performed_by, created_at
          ) VALUES (?, ?, ?, ?, datetime('now'))
        `, [
          userId,
          'subscription_purchase',
          `New ${plan.name} subscription assigned by ${req.user.name} (${req.user.role}). Payment: $${paymentAmount}. ${notes}`.trim(),
          req.user.id
        ]);

        // Get the created subscription with plan details
        resultSubscription = await db.get(`
          SELECT 
            us.*,
            sp.name as plan_name,
            sp.equipment_access,
            sp.monthly_price,
            sp.monthly_classes,
            sp.category,
            u.name as user_name,
            u.email as user_email
          FROM user_subscriptions us
          JOIN subscription_plans sp ON us.plan_id = sp.id
          JOIN users u ON us.user_id = u.id
          WHERE us.id = ?
        `, [subscriptionResult.id]);

        operationType = 'assigned';
        console.log(`🎫 Reception assigned ${plan.name} subscription to ${user.name} (${user.email}). Payment: $${paymentAmount}`);
      }

      // Create notification for the user
      await subscriptionNotificationService.createSubscriptionChangeNotification(
        userId,
        operationType === 'extended' ? 'extended' : operationType === 'assigned' ? 'assigned' : 'replaced',
        operationType === 'extended' ? 
          `Added ${plan.monthly_classes} classes from ${plan.name} plan. Payment: $${paymentAmount}` :
          `${plan.name} subscription. Payment: $${paymentAmount}`,
        req.user.id
      );

      // Commit transaction
      await db.run('COMMIT');

      res.status(201).json({
        success: true,
        message: `Subscription ${operationType} successfully`,
        data: {
          subscription: resultSubscription,
          paymentAmount: paymentAmount,
          operationType: operationType,
          classesAdded: plan.monthly_classes
        }
      });

    } catch (transactionError) {
      await db.run('ROLLBACK');
      throw transactionError;
    }

  } catch (error) {
    console.error('Assign subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});



// PUT /api/subscriptions/:id/renew - Renew subscription
router.put('/:id/renew', authenticateToken, [
  body('paymentMethod').optional().isString().withMessage('Payment method must be string')
], async (req, res) => {
  try {
    const { paymentMethod = 'card' } = req.body;

    const subscription = await db.get(`
      SELECT 
        us.*,
        sp.monthly_price,
        sp.monthly_classes,
        sp.duration_months
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.id = ?
    `, [req.params.id]);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && req.user.role !== 'reception' && subscription.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (subscription.status === 'active') {
      return res.status(400).json({
        success: false,
        message: 'Subscription is already active'
      });
    }

    // Calculate new dates based on plan duration
    const startDate = moment().format('YYYY-MM-DD');
    const duration = subscription.duration_months || 1;
    // For fractional months less than 1, convert to days for more accurate calculation
    const endDate = duration < 1 ? 
      moment().add(Math.max(1, Math.round(duration * 30.44)), 'days').format('YYYY-MM-DD') :
      moment().add(duration, 'months').format('YYYY-MM-DD');

    await db.run('BEGIN TRANSACTION');

    try {
      // Update subscription
      await db.run(`
        UPDATE user_subscriptions SET 
          remaining_classes = ?,
          start_date = ?,
          end_date = ?,
          status = 'active',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [subscription.monthly_classes, startDate, endDate, req.params.id]);

      // Create payment record
      await db.run(`
        INSERT INTO payments (
          user_id, subscription_id, amount, payment_date, payment_method
        ) VALUES (?, ?, ?, ?, ?)
      `, [subscription.user_id, req.params.id, subscription.monthly_price, startDate, paymentMethod]);

      await db.run('COMMIT');

      res.json({
        success: true,
        message: 'Subscription renewed successfully'
      });

    } catch (transactionError) {
      await db.run('ROLLBACK');
      throw transactionError;
    }

  } catch (error) {
    console.error('Renew subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Internal function to update expired subscriptions (can be called by a cron job)
router.put('/update-expired', authenticateToken, requireAdminOrReception, async (req, res) => {
  try {
    const today = moment().format('YYYY-MM-DD');
    
    const result = await db.run(
      'UPDATE user_subscriptions SET status = "expired" WHERE end_date < ? AND status = "active"',
      [today]
    );

    res.json({
      success: true,
      message: `Updated ${result.changes} expired subscriptions`
    });

  } catch (error) {
    console.error('Update expired subscriptions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/subscriptions/user/:userId - Get all subscriptions for a specific user (admin only)
router.get('/user/:userId', authenticateToken, requireAdminOrReception, async (req, res) => {
  try {
    // First, update any expired subscriptions
    await updateExpiredSubscriptions();
    
    const { userId } = req.params;
    const { status } = req.query;
    
    let query = `
      SELECT DISTINCT
        us.*,
        sp.name as plan_name,
        sp.equipment_access,
        sp.monthly_price,
        sp.monthly_classes,
        sp.category,
        sp.features,
        sp.duration_months,
        mc.admin_id as assigned_by_id,
        assigned_by.name as assigned_by_name,
        assigned_by.role as assigned_by_role,
        mc.created_at as assignment_date,
        mc.description as assignment_notes,
        CASE 
          WHEN DATE(us.end_date) < DATE('now') AND us.status = 'active' THEN 'expired'
          ELSE us.status
        END as actual_status
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      LEFT JOIN manual_credits mc ON (
        mc.user_id = us.user_id 
        AND mc.reason = 'promotional' 
        AND mc.description LIKE '%subscription assigned%'
        AND DATE(mc.created_at) = DATE(us.created_at)
        AND mc.id = (
          SELECT MIN(mc2.id) 
          FROM manual_credits mc2 
          WHERE mc2.user_id = us.user_id 
            AND mc2.reason = 'promotional' 
            AND mc2.description LIKE '%subscription assigned%'
            AND DATE(mc2.created_at) = DATE(us.created_at)
        )
      )
      LEFT JOIN users assigned_by ON mc.admin_id = assigned_by.id
      WHERE us.user_id = ?
    `;
    
    const params = [userId];

    if (status) {
      query += ' AND us.status = ?';
      params.push(status);
    }

    query += ' ORDER BY us.created_at DESC';

    const subscriptions = await db.all(query, params);

    console.log(`📊 Found ${subscriptions.length} subscriptions for user ${userId}`);

    // Parse features JSON and format assignment info for each subscription
    const formattedSubscriptions = subscriptions.map(subscription => ({
      ...subscription,
      status: subscription.actual_status, // Use the calculated status
      features: subscription.features ? JSON.parse(subscription.features) : [],
      assigned_by: subscription.assigned_by_id ? {
        id: subscription.assigned_by_id,
        name: subscription.assigned_by_name,
        role: subscription.assigned_by_role,
        assignment_date: subscription.assignment_date,
        assignment_notes: subscription.assignment_notes
      } : null
    }));

    res.json({
      success: true,
      data: formattedSubscriptions
    });

  } catch (error) {
    console.error('Get user subscriptions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/subscriptions/user/:userId/stats - Get subscription statistics for a specific user (admin only)
router.get('/user/:userId/stats', authenticateToken, requireAdminOrReception, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get total subscription count
    const totalSubscriptions = await db.get(`
      SELECT COUNT(*) as count FROM user_subscriptions WHERE user_id = ?
    `, [userId]);

    // Get current active subscription
    const currentSubscription = await db.get(`
      SELECT 
        us.*,
        sp.name as plan_name,
        sp.monthly_price,
        sp.equipment_access
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.user_id = ? AND us.status = 'active'
      ORDER BY us.created_at DESC
      LIMIT 1
    `, [userId]);

    // Get subscription history summary
    const subscriptionSummary = await db.all(`
      SELECT 
        sp.name as plan_name,
        COUNT(*) as purchase_count,
        SUM(sp.monthly_price) as total_spent
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.user_id = ?
      GROUP BY sp.id, sp.name
      ORDER BY purchase_count DESC
    `, [userId]);

    // Get total money spent on subscriptions (from payments)
    const totalSpent = await db.get(`
      SELECT 
        COALESCE(SUM(p.amount), 0) as total_amount
      FROM payments p
      JOIN user_subscriptions us ON p.subscription_id = us.id
      WHERE us.user_id = ? AND p.status = 'completed'
    `, [userId]);

    res.json({
      success: true,
      data: {
        totalSubscriptions: totalSubscriptions.count,
        currentSubscription: currentSubscription || null,
        subscriptionSummary,
        totalSpent: totalSpent.total_amount
      }
    });

  } catch (error) {
    console.error('Get user subscription stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/subscriptions/assignments - Get assignment history for admin (admin/reception only)
router.get('/assignments', authenticateToken, requireAdminOrReception, async (req, res) => {
  try {
    const { adminId, userId, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT 
        mc.id,
        mc.user_id,
        mc.admin_id,
        mc.classes_added,
        mc.description,
        mc.created_at,
        user.name as client_name,
        user.email as client_email,
        admin.name as admin_name,
        admin.role as admin_role,
        us.id as subscription_id,
        sp.name as plan_name,
        sp.monthly_price,
        us.status as subscription_status
      FROM manual_credits mc
      INNER JOIN users user ON mc.user_id = user.id
      INNER JOIN users admin ON mc.admin_id = admin.id
      LEFT JOIN user_subscriptions us ON (
        us.user_id = mc.user_id 
        AND DATE(us.created_at) = DATE(mc.created_at)
        AND mc.description LIKE '%subscription assigned%'
      )
      LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE mc.reason = 'promotional' 
        AND mc.description LIKE '%subscription assigned%'
    `;
    
    const params = [];
    
    // Filter by specific admin if requested
    if (adminId) {
      query += ' AND mc.admin_id = ?';
      params.push(adminId);
    }
    
    // Filter by specific user if requested
    if (userId) {
      query += ' AND mc.user_id = ?';
      params.push(userId);
    }
    
    query += ' ORDER BY mc.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const assignments = await db.all(query, params);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM manual_credits mc
      WHERE mc.reason = 'promotional' 
        AND mc.description LIKE '%subscription assigned%'
    `;
    
    const countParams = [];
    if (adminId) {
      countQuery += ' AND mc.admin_id = ?';
      countParams.push(adminId);
    }
    
    if (userId) {
      countQuery += ' AND mc.user_id = ?';
      countParams.push(userId);
    }
    
    const totalResult = await db.get(countQuery, countParams);
    const total = totalResult.total;

    res.json({
      success: true,
      data: {
        assignments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get assignment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/subscriptions/assignments/stats - Get assignment statistics (admin/reception only)
router.get('/assignments/stats', authenticateToken, requireAdminOrReception, async (req, res) => {
  try {
    const { adminId, dateFrom, dateTo } = req.query;
    
    let whereClause = `
      WHERE mc.reason = 'promotional' 
        AND mc.description LIKE '%subscription assigned%'
    `;
    const params = [];
    
    if (adminId) {
      whereClause += ' AND mc.admin_id = ?';
      params.push(adminId);
    }
    
    if (dateFrom) {
      whereClause += ' AND DATE(mc.created_at) >= ?';
      params.push(dateFrom);
    }
    
    if (dateTo) {
      whereClause += ' AND DATE(mc.created_at) <= ?';
      params.push(dateTo);
    }

    // Get total assignments
    const totalAssignments = await db.get(`
      SELECT COUNT(*) as count
      FROM manual_credits mc
      ${whereClause}
    `, params);

    // Get assignments by admin
    const assignmentsByAdmin = await db.all(`
      SELECT 
        admin.name as admin_name,
        admin.role as admin_role,
        COUNT(*) as assignment_count,
        SUM(mc.classes_added) as total_classes_assigned
      FROM manual_credits mc
      INNER JOIN users admin ON mc.admin_id = admin.id
      ${whereClause}
      GROUP BY mc.admin_id, admin.name, admin.role
      ORDER BY assignment_count DESC
    `, params);

    // Get assignments by month (last 12 months)
    const assignmentsByMonth = await db.all(`
      SELECT 
        strftime('%Y-%m', mc.created_at) as month,
        COUNT(*) as assignment_count,
        SUM(mc.classes_added) as classes_assigned
      FROM manual_credits mc
      ${whereClause}
      GROUP BY strftime('%Y-%m', mc.created_at)
      ORDER BY month DESC
      LIMIT 12
    `, params);

    res.json({
      success: true,
      data: {
        totalAssignments: totalAssignments.count,
        assignmentsByAdmin,
        assignmentsByMonth
      }
    });

  } catch (error) {
    console.error('Get assignment stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// PUT /api/subscriptions/:id/add-classes - Add classes to existing subscription (Admin/Reception only)
router.put('/:id/add-classes', authenticateToken, requireAdminOrReception, [
  body('classesToAdd').isInt({ min: 1, max: 100 }).withMessage('Classes to add must be between 1 and 100'),
  body('planId').isInt({ min: 1 }).withMessage('Valid plan ID is required for pricing'),
  body('reason').optional().isString().withMessage('Reason must be a string'),
  body('paymentAmount').optional().isNumeric().withMessage('Payment amount must be numeric')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { classesToAdd, planId, reason = 'Administrative class addition', paymentAmount = 0 } = req.body;
    const subscriptionId = req.params.id;
    
    // Get the subscription
    const subscription = await db.get(`
      SELECT 
        us.*,
        sp.name as plan_name,
        sp.monthly_price,
        sp.monthly_classes,
        u.name as user_name,
        u.email as user_email
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      JOIN users u ON us.user_id = u.id
      WHERE us.id = ?
    `, [subscriptionId]);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    if (subscription.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Can only add classes to active subscriptions'
      });
    }

    // Get the plan being used for pricing
    const pricingPlan = await db.get('SELECT * FROM subscription_plans WHERE id = ? AND is_active = 1', [planId]);
    if (!pricingPlan) {
      return res.status(404).json({
        success: false,
        message: 'Pricing plan not found or inactive'
      });
    }

    // Calculate price per class from the plan
    const pricePerClass = pricingPlan.monthly_price / pricingPlan.monthly_classes;
    const totalAmount = paymentAmount || (pricePerClass * classesToAdd);

    await db.run('BEGIN TRANSACTION');

    try {
      // Update subscription with additional classes
      const newRemainingClasses = subscription.remaining_classes + classesToAdd;
      
      await db.run(`
        UPDATE user_subscriptions 
        SET remaining_classes = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [newRemainingClasses, subscriptionId]);

      // Record the class addition in manual_credits table for tracking
      await db.run(`
        INSERT INTO manual_credits (
          user_id, admin_id, amount, classes_added, reason, description, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `, [
        subscription.user_id, 
        req.user.id, 
        totalAmount,
        classesToAdd,
        'adjustment',
        `${classesToAdd} classes added from ${pricingPlan.name} plan by ${req.user.role} ${req.user.name}. ${reason}`.trim()
      ]);

      // Create payment record if there's a charge
      if (totalAmount > 0) {
        await db.run(`
          INSERT INTO payments (
            user_id, subscription_id, amount, payment_date, payment_method, status
          ) VALUES (?, ?, ?, ?, ?, ?)
        `, [subscription.user_id, subscriptionId, totalAmount, moment().format('YYYY-MM-DD'), 'manual', 'completed']);
      }

      // Log the activity
      await db.run(`
        INSERT INTO client_activity_log (
          client_id, activity_type, description, performed_by
        ) VALUES (?, ?, ?, ?)
      `, [
        subscription.user_id,
        'subscription_extended',
        `${classesToAdd} classes added to subscription by ${req.user.name} (${req.user.role}). Total classes now: ${newRemainingClasses}`,
        req.user.id
      ]);

      await db.run('COMMIT');

      console.log(`💰 Reception added ${classesToAdd} classes to ${subscription.user_name}'s subscription (ID: ${subscriptionId}) for $${totalAmount.toFixed(2)}`);

      // Get updated subscription
      const updatedSubscription = await db.get(`
        SELECT 
          us.*,
          sp.name as plan_name,
          sp.equipment_access,
          sp.monthly_price,
          sp.monthly_classes,
          sp.category
        FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE us.id = ?
      `, [subscriptionId]);

      res.json({
        success: true,
        message: `Successfully added ${classesToAdd} classes to ${subscription.user_name}'s subscription`,
        data: {
          subscription: updatedSubscription,
          classesAdded: classesToAdd,
          amountCharged: totalAmount,
          pricePerClass: pricePerClass.toFixed(2),
          pricingPlan: pricingPlan.name,
          reason: reason
        }
      });

    } catch (transactionError) {
      await db.run('ROLLBACK');
      throw transactionError;
    }

  } catch (error) {
    console.error('Add classes to subscription error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      subscriptionId: req.params.id,
      requestBody: req.body,
      user: req.user ? { id: req.user.id, role: req.user.role, name: req.user.name } : 'NO USER'
    });
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message // Add error message for debugging
    });
  }
});

// PUT /api/subscriptions/:id/remove-classes - Remove classes from existing subscription (Admin/Reception only)
router.put('/:id/remove-classes', authenticateToken, requireAdminOrReception, [
  body('classesToRemove').isInt({ min: 1, max: 100 }).withMessage('Classes to remove must be between 1 and 100'),
  body('reason').optional().isString().withMessage('Reason must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { classesToRemove, reason = 'Administrative class removal' } = req.body;
    const subscriptionId = req.params.id;
    
    // Get the subscription
    const subscription = await db.get(`
      SELECT 
        us.*,
        sp.name as plan_name,
        sp.monthly_price,
        sp.monthly_classes,
        u.name as user_name,
        u.email as user_email
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      JOIN users u ON us.user_id = u.id
      WHERE us.id = ?
    `, [subscriptionId]);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    if (subscription.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Can only remove classes from active subscriptions'
      });
    }

    // Check if there are enough classes to remove
    if (subscription.remaining_classes < classesToRemove) {
      return res.status(400).json({
        success: false,
        message: `Cannot remove ${classesToRemove} classes. Only ${subscription.remaining_classes} classes remaining.`
      });
    }

    // Calculate price per class from the current plan
    const pricePerClass = subscription.monthly_price / subscription.monthly_classes;
    const totalAmount = pricePerClass * classesToRemove;

    await db.run('BEGIN TRANSACTION');

    try {
      // Update subscription with removed classes
      const newRemainingClasses = subscription.remaining_classes - classesToRemove;
      
      await db.run(`
        UPDATE user_subscriptions 
        SET remaining_classes = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `, [newRemainingClasses, subscriptionId]);

      // Record the class removal in manual_credits table for tracking (as negative classes)
      await db.run(`
        INSERT INTO manual_credits (
          user_id, admin_id, amount, classes_added, reason, description, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `, [
        subscription.user_id, 
        req.user.id, 
        -totalAmount,
        -classesToRemove,
        'adjustment',
        `${classesToRemove} classes removed from ${subscription.plan_name} plan by ${req.user.role} ${req.user.name}. ${reason}`.trim()
      ]);

      // Create a credit record for the refund amount
      if (totalAmount > 0) {
        await db.run(`
          INSERT INTO payments (
            user_id, subscription_id, amount, payment_date, payment_method, status
          ) VALUES (?, ?, ?, ?, ?, ?)
        `, [subscription.user_id, subscriptionId, -totalAmount, moment().format('YYYY-MM-DD'), 'manual', 'completed']);
      }

      // Log the activity
      await db.run(`
        INSERT INTO client_activity_log (
          client_id, activity_type, description, performed_by
        ) VALUES (?, ?, ?, ?)
      `, [
        subscription.user_id,
        'subscription_extended',
        `${classesToRemove} classes removed from subscription by ${req.user.name} (${req.user.role}). Total classes now: ${newRemainingClasses}`,
        req.user.id
      ]);

      await db.run('COMMIT');

      console.log(`🔄 Reception removed ${classesToRemove} classes from ${subscription.user_name}'s subscription (ID: ${subscriptionId}) for $${totalAmount.toFixed(2)} refund`);

      // Get updated subscription
      const updatedSubscription = await db.get(`
        SELECT 
          us.*,
          sp.name as plan_name,
          sp.equipment_access,
          sp.monthly_price,
          sp.monthly_classes,
          sp.category
        FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE us.id = ?
      `, [subscriptionId]);

      res.json({
        success: true,
        message: `Successfully removed ${classesToRemove} classes from ${subscription.user_name}'s subscription`,
        data: {
          subscription: updatedSubscription,
          classesRemoved: classesToRemove,
          amountRefunded: totalAmount,
          pricePerClass: pricePerClass.toFixed(2),
          pricingPlan: subscription.plan_name,
          reason: reason
        }
      });

    } catch (transactionError) {
      await db.run('ROLLBACK');
      throw transactionError;
    }

  } catch (error) {
    console.error('Remove classes from subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/subscriptions/stats - Get subscription statistics (admin/reception only)
router.get('/stats', authenticateToken, requireAdminOrReception, async (req, res) => {
  try {
    // Get total subscriptions
    const totalSubscriptions = await db.get(`
      SELECT COUNT(*) as count FROM user_subscriptions
    `);

    // Get active subscriptions
    const activeSubscriptions = await db.get(`
      SELECT COUNT(*) as count FROM user_subscriptions WHERE status = 'active'
    `);

    // Get subscription distribution by status
    const statusDistribution = await db.all(`
      SELECT 
        status,
        COUNT(*) as count
      FROM user_subscriptions
      GROUP BY status
      ORDER BY count DESC
    `);

    // Get plan popularity
    const planPopularity = await db.all(`
      SELECT 
        sp.name as plan_name,
        sp.monthly_price,
        sp.equipment_access,
        sp.category,
        COUNT(us.id) as subscriber_count,
        SUM(CASE WHEN us.status = 'active' THEN 1 ELSE 0 END) as active_subscribers,
        SUM(sp.monthly_price) as total_revenue_potential,
        SUM(CASE WHEN us.status = 'active' THEN sp.monthly_price ELSE 0 END) as active_revenue
      FROM subscription_plans sp
      LEFT JOIN user_subscriptions us ON sp.id = us.plan_id
      WHERE sp.is_active = 1
      GROUP BY sp.id, sp.name, sp.monthly_price, sp.equipment_access, sp.category
      ORDER BY subscriber_count DESC
    `);

    // Calculate churn rate (cancelled vs total)
    const churnStats = await db.get(`
      SELECT 
        COUNT(*) as total_subscriptions,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_subscriptions,
        SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired_subscriptions
      FROM user_subscriptions
    `);

    const churnRate = churnStats.total_subscriptions > 0 
      ? Math.round(((churnStats.cancelled_subscriptions + churnStats.expired_subscriptions) / churnStats.total_subscriptions) * 100)
      : 0;

    // Get average subscription length
    const avgLength = await db.get(`
      SELECT 
        AVG(
          CASE 
            WHEN status IN ('cancelled', 'expired') AND end_date IS NOT NULL 
            THEN julianday(end_date) - julianday(start_date)
            WHEN status = 'active'
            THEN julianday('now') - julianday(start_date)
            ELSE 30
          END
        ) as avg_days
      FROM user_subscriptions
    `);

    // Get monthly subscription trends (last 12 months)
    const monthlyTrends = await db.all(`
      SELECT 
        strftime('%Y-%m', created_at) as month,
        COUNT(*) as new_subscriptions,
        SUM(sp.monthly_price) as revenue_potential
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.created_at >= date('now', '-12 months')
      GROUP BY strftime('%Y-%m', created_at)
      ORDER BY month DESC
    `);

    // Get equipment access distribution
    const equipmentDistribution = await db.all(`
      SELECT 
        sp.equipment_access,
        COUNT(us.id) as subscriber_count,
        SUM(CASE WHEN us.status = 'active' THEN 1 ELSE 0 END) as active_count
      FROM subscription_plans sp
      LEFT JOIN user_subscriptions us ON sp.id = us.plan_id
      WHERE sp.is_active = 1
      GROUP BY sp.equipment_access
      ORDER BY subscriber_count DESC
    `);

    // Get subscription renewals vs new subscriptions
    const renewalStats = await db.all(`
      SELECT 
        u.id as user_id,
        COUNT(us.id) as subscription_count
      FROM users u
      JOIN user_subscriptions us ON u.id = us.user_id
      WHERE u.role = 'client'
      GROUP BY u.id
    `);

    const newSubscribers = renewalStats.filter(stat => stat.subscription_count === 1).length;
    const renewalSubscribers = renewalStats.filter(stat => stat.subscription_count > 1).length;

    // Get revenue from active subscriptions
    const revenueStats = await db.get(`
      SELECT 
        SUM(sp.monthly_price) as monthly_recurring_revenue,
        COUNT(us.id) as active_subscribers,
        AVG(sp.monthly_price) as average_subscription_value
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.status = 'active'
    `);

    res.json({
      success: true,
      data: {
        totalSubscriptions: totalSubscriptions.count,
        activeSubscriptions: activeSubscriptions.count,
        churnRate,
        averageSubscriptionLength: Math.round(avgLength.avg_days || 30),
        planPopularity: planPopularity.map(plan => ({
          ...plan,
          subscriber_percentage: totalSubscriptions.count > 0 
            ? Math.round((plan.subscriber_count / totalSubscriptions.count) * 100)
            : 0
        })),
        statusDistribution,
        equipmentDistribution,
        monthlyTrends,
        renewalMetrics: {
          newSubscribers,
          renewalSubscribers,
          renewalRate: (newSubscribers + renewalSubscribers) > 0 
            ? Math.round((renewalSubscribers / (newSubscribers + renewalSubscribers)) * 100)
            : 0
        },
        revenueMetrics: {
          monthlyRecurringRevenue: revenueStats.monthly_recurring_revenue || 0,
          averageSubscriptionValue: revenueStats.average_subscription_value || 0,
          activeSubscribers: revenueStats.active_subscribers || 0
        }
      }
    });

  } catch (error) {
    console.error('Get subscription stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router; 