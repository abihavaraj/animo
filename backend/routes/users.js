const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, requireAdmin, requireAdminOrReception } = require('../middleware/auth');

const router = express.Router();

// GET /api/users - Get all users (admin only)
router.get('/', authenticateToken, requireAdminOrReception, async (req, res) => {
  try {
    const { role, status, search } = req.query;
    
    let query = `
      SELECT 
        id, name, email, phone, role, emergency_contact, 
        medical_conditions, join_date, status, created_at, credit_balance
      FROM users 
      WHERE 1=1
    `;
    
    const params = [];

    if (role) {
      query += ' AND role = ?';
      params.push(role);
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND (name LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC';

    const users = await db.all(query, params);

    res.json({
      success: true,
      data: users
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/users/stats - Get user statistics (admin only)
router.get('/stats', authenticateToken, requireAdminOrReception, async (req, res) => {
  try {
    const totalUsers = await db.get('SELECT COUNT(*) as count FROM users');
    const clientsCount = await db.get('SELECT COUNT(*) as count FROM users WHERE role = "client"');
    const instructorsCount = await db.get('SELECT COUNT(*) as count FROM users WHERE role = "instructor"');
    const activeUsers = await db.get('SELECT COUNT(*) as count FROM users WHERE status = "active"');
    
    const recentUsers = await db.get(`
      SELECT COUNT(*) as count FROM users 
      WHERE created_at >= date('now', '-30 days')
    `);

    const subscriptionStats = await db.get(`
      SELECT 
        COUNT(*) as active_subscriptions,
        SUM(sp.monthly_price) as monthly_revenue
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.status = 'active'
    `);

    res.json({
      success: true,
      data: {
        totalUsers: totalUsers.count,
        clients: clientsCount.count,
        instructors: instructorsCount.count,
        activeUsers: activeUsers.count,
        recentUsers: recentUsers.count,
        activeSubscriptions: subscriptionStats.active_subscriptions || 0,
        monthlyRevenue: subscriptionStats.monthly_revenue || 0
      }
    });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/users/instructors/list - Get instructors list
router.get('/instructors/list', authenticateToken, async (req, res) => {
  try {
    const instructors = await db.all(`
      SELECT id, name, email, phone
      FROM users 
      WHERE role IN ('instructor', 'admin', 'reception') AND status = 'active'
      ORDER BY name
    `);

    res.json({
      success: true,
      data: instructors
    });

  } catch (error) {
    console.error('Get instructors error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/user/notification-settings - Get user's notification settings
router.get('/notification-settings', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Debug: notification-settings GET endpoint hit');
    console.log('🔍 Debug: req.user:', req.user);
    console.log('🔍 Debug: user ID:', req.user?.id);
    console.log('🔍 Debug: user role:', req.user?.role);
    
    const userId = req.user.id;

    // First try to get settings, if table doesn't exist we'll create it
    let settings;
    try {
      console.log('🔍 Debug: Attempting to query notification_settings table');
      settings = await db.get(`
        SELECT * FROM notification_settings WHERE user_id = ?
      `, [userId]);
      console.log('🔍 Debug: Found settings:', settings);
    } catch (error) {
      console.log('🔍 Debug: Error querying notification_settings:', error.message);
      // If table doesn't exist, create it
      if (error.message.includes('no such table')) {
        console.log('Creating notification_settings table...');
        await db.run(`
          CREATE TABLE IF NOT EXISTS notification_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            enable_notifications BOOLEAN DEFAULT 1,
            default_reminder_minutes INTEGER DEFAULT 15,
            enable_push_notifications BOOLEAN DEFAULT 1,
            enable_email_notifications BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
            UNIQUE(user_id)
          )
        `);
        console.log('✅ Created notification_settings table');
        
        // Try to get settings again
        settings = await db.get(`
          SELECT * FROM notification_settings WHERE user_id = ?
        `, [userId]);
      } else {
        throw error;
      }
    }

    // If no settings found, return defaults (phone notifications only)
    if (!settings) {
      console.log('🔍 Debug: No settings found, using defaults');
      settings = {
        user_id: userId,
        enable_notifications: 1,
        default_reminder_minutes: 15,
        enable_push_notifications: 1,
        enable_email_notifications: 0
      };
    }

    // Convert to frontend format (phone notifications only)
    const formattedSettings = {
      enableNotifications: !!settings.enable_notifications && !!settings.enable_push_notifications,
      emailNotifications: false, // Always false since user only wants phone notifications
      classUpdates: !!settings.enable_notifications, // Same as general notifications
      reminderMinutes: settings.default_reminder_minutes || 15
    };

    console.log('🔍 Debug: Returning formatted settings:', formattedSettings);

    res.json({
      success: true,
      data: formattedSettings
    });

  } catch (error) {
    console.error('Get notification settings error:', error);
    console.log('🔍 Debug: Returning 500 error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// PUT /api/user/notification-settings - Update user's notification settings
router.put('/notification-settings', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Debug: notification-settings PUT endpoint hit');
    console.log('🔍 Debug: req.body:', req.body);
    
    const userId = req.user.id;
    const { enableNotifications, reminderMinutes } = req.body;

    // Validate input
    if (typeof enableNotifications !== 'boolean' || typeof reminderMinutes !== 'number') {
      console.log('🔍 Debug: Invalid input validation');
      return res.status(400).json({
        success: false,
        message: 'Invalid notification settings format'
      });
    }

    // Ensure table exists
    try {
      await db.run(`
        CREATE TABLE IF NOT EXISTS notification_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          enable_notifications BOOLEAN DEFAULT 1,
          default_reminder_minutes INTEGER DEFAULT 15,
          enable_push_notifications BOOLEAN DEFAULT 1,
          enable_email_notifications BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
          UNIQUE(user_id)
        )
      `);
    } catch (error) {
      // Table already exists, continue
    }

    // Insert or update settings (phone notifications only, email disabled)
    await db.run(`
      INSERT OR REPLACE INTO notification_settings 
      (user_id, enable_notifications, default_reminder_minutes, enable_push_notifications, enable_email_notifications, updated_at)
      VALUES (?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
    `, [
      userId, 
      enableNotifications ? 1 : 0,
      reminderMinutes,
      enableNotifications ? 1 : 0  // Push notifications same as general notifications
    ]);

    console.log(`✅ Updated notification settings for user ${req.user.name} (ID: ${userId}) - Phone notifications only`);

    res.json({
      success: true,
      message: 'Notification settings updated successfully'
    });

  } catch (error) {
    console.error('Update notification settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/users/:id - Get single user (admin only)
router.get('/:id', authenticateToken, requireAdminOrReception, async (req, res) => {
  try {
    const user = await db.get(`
      SELECT 
        id, name, email, phone, role, emergency_contact, 
        medical_conditions, join_date, status, created_at,
        credit_balance
      FROM users 
      WHERE id = ?
    `, [req.params.id]);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's subscription if they're a client
    if (user.role === 'client') {
      const subscription = await db.get(`
        SELECT 
          us.*,
          sp.name as plan_name,
          sp.equipment_access,
          sp.monthly_price
        FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE us.user_id = ? AND us.status = 'active' AND DATE(us.end_date) > DATE('now')
        ORDER BY us.created_at DESC
        LIMIT 1
      `, [user.id]);

      user.currentSubscription = subscription;
    }

    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/users - Create new user (admin only)
router.post('/', authenticateToken, requireAdminOrReception, [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['client', 'instructor', 'admin', 'reception']).withMessage('Invalid role'),
  body('phone').optional(),
  body('emergencyContact').optional(),
  body('medicalConditions').optional(),
  body('initialCreditBalance').optional().isFloat({ min: 0 }).withMessage('Initial credit balance must be a positive number'),
  body('referralSource').optional().isIn([
    'google_search', 'social_media', 'friend_referral', 'website', 
    'instagram', 'facebook', 'local_ad', 'word_of_mouth', 'flyer', 'event', 'other'
  ]).withMessage('Invalid referral source')
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

    const { name, email, password, role, phone, emergencyContact, medicalConditions, initialCreditBalance = 0, referralSource } = req.body;

    // Check if user already exists
    const existingUser = await db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Start transaction
    await db.run('BEGIN TRANSACTION');

    try {
      // Create user with initial credit balance
      const result = await db.run(`
        INSERT INTO users (name, email, password, phone, role, emergency_contact, medical_conditions, credit_balance, referral_source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [name, email, hashedPassword, phone, role, emergencyContact, medicalConditions, initialCreditBalance, referralSource]);

      // If initial credit balance is provided, create a manual credit record
      if (initialCreditBalance > 0) {
        await db.run(`
          INSERT INTO manual_credits (
            user_id, admin_id, amount, classes_added, reason, description
          ) VALUES (?, ?, ?, ?, ?, ?)
        `, [
          result.id, 
          req.user.id, 
          initialCreditBalance,
          0,
          'adjustment',
          `Initial credit balance on account creation by ${req.user.name}`
        ]);
        
        console.log(`💳 Added initial credit balance of $${initialCreditBalance} for new user ${name} (ID: ${result.id}) - 0 classes available until credits are converted`);
      }

      // Commit transaction
      await db.run('COMMIT');

      // Get created user (without password)
      const newUser = await db.get(`
        SELECT 
          id, name, email, phone, role, emergency_contact, 
          medical_conditions, referral_source, join_date, status, created_at, credit_balance
        FROM users 
        WHERE id = ?
      `, [result.id]);

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: newUser
      });

    } catch (transactionError) {
      await db.run('ROLLBACK');
      throw transactionError;
    }

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// PUT /api/users/:id - Update user (admin only)
router.put('/:id', authenticateToken, requireAdminOrReception, [
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('role').optional().isIn(['client', 'instructor', 'admin', 'reception']).withMessage('Invalid role'),
  body('status').optional().isIn(['active', 'inactive', 'suspended']).withMessage('Invalid status'),
  body('phone').optional(),
  body('emergencyContact').optional(),
  body('medicalConditions').optional()
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

    const existingUser = await db.get('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if email is already taken by another user
    if (req.body.email) {
      const emailConflict = await db.get(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [req.body.email, req.params.id]
      );
      if (emailConflict) {
        return res.status(409).json({
          success: false,
          message: 'Email is already taken by another user'
        });
      }
    }

    const updates = {};
    const allowedFields = ['name', 'email', 'role', 'status', 'phone', 'emergencyContact', 'medicalConditions'];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'emergencyContact') {
          updates.emergency_contact = req.body[field];
        } else if (field === 'medicalConditions') {
          updates.medical_conditions = req.body[field];
        } else {
          updates[field] = req.body[field];
        }
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    // Build update query
    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), req.params.id];

    await db.run(
      `UPDATE users SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    // Get updated user
    const updatedUser = await db.get(`
      SELECT 
        id, name, email, phone, role, emergency_contact, 
        medical_conditions, join_date, status, created_at, credit_balance
      FROM users 
      WHERE id = ?
    `, [req.params.id]);

    res.json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// PUT /api/users/:id/password - Reset user password (admin only)
router.put('/:id/password', authenticateToken, requireAdminOrReception, [
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
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

    const existingUser = await db.get('SELECT id FROM users WHERE id = ?', [req.params.id]);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const hashedPassword = await bcrypt.hash(req.body.newPassword, 10);

    await db.run(
      'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedPassword, req.params.id]
    );

    res.json({
      success: true,
      message: 'Password updated successfully'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// DELETE /api/users/:id - Delete user (admin only)
router.delete('/:id', authenticateToken, requireAdminOrReception, async (req, res) => {
  try {
    const existingUser = await db.get('SELECT id, role FROM users WHERE id = ?', [req.params.id]);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Don't allow deleting the current admin
    if (existingUser.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    // Check if user has active bookings or subscriptions
    const activeBookings = await db.get(
      'SELECT COUNT(*) as count FROM bookings WHERE user_id = ? AND status IN ("confirmed", "completed")',
      [req.params.id]
    );

    const activeSubscriptions = await db.get(
      'SELECT COUNT(*) as count FROM user_subscriptions WHERE user_id = ? AND status = "active"',
      [req.params.id]
    );

    if (activeBookings.count > 0 || activeSubscriptions.count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete user with active bookings or subscriptions. Consider suspending the account instead.'
      });
    }

    await db.run('DELETE FROM users WHERE id = ?', [req.params.id]);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/users/register-push-token - Register user's push notification token
router.post('/register-push-token', authenticateToken, async (req, res) => {
  try {
    const { pushToken } = req.body;
    const userId = req.user.id;

    if (!pushToken) {
      return res.status(400).json({
        success: false,
        message: 'Push token is required'
      });
    }

    // Update user's push token
    await db.run(`
      UPDATE users SET push_token = ? WHERE id = ?
    `, [pushToken, userId]);

    console.log(`📱 Push token registered for user ${req.user.name}: ${pushToken}`);

    res.json({
      success: true,
      message: 'Push token registered successfully'
    });

  } catch (error) {
    console.error('Register push token error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/users/me/classes-and-credits - Get comprehensive class and credit info
router.get('/me/classes-and-credits', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get current subscription classes (subscription-based only)
    const subscriptionClasses = await db.get(`
      SELECT 
        us.remaining_classes as subscription_classes,
        us.status as subscription_status,
        us.end_date,
        sp.name as plan_name,
        sp.equipment_access
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.user_id = ? 
        AND (us.status = 'active' OR (us.status = 'cancelled' AND us.remaining_classes > 0 AND DATE(us.end_date) >= DATE('now')))
      ORDER BY us.created_at DESC
      LIMIT 1
    `, [userId]);

    // Get credit balance (just for money, not classes)
    const creditBalance = await db.get(`
      SELECT COALESCE(SUM(amount), 0) as total_credits
      FROM manual_credits 
      WHERE user_id = ?
    `, [userId]);

    // Get recent credit transactions
    const recentCredits = await db.all(`
      SELECT 
        mc.*,
        u.name as admin_name
      FROM manual_credits mc
      LEFT JOIN users u ON mc.admin_id = u.id
      WHERE mc.user_id = ?
      ORDER BY mc.created_at DESC
      LIMIT 5
    `, [userId]);

    res.json({
      success: true,
      data: {
        subscription: {
          classes_remaining: subscriptionClasses?.subscription_classes || 0,
          status: subscriptionClasses?.subscription_status || 'none',
          plan_name: subscriptionClasses?.plan_name || 'No Plan',
          equipment_access: subscriptionClasses?.equipment_access || 'none',
          valid_until: subscriptionClasses?.end_date || null,
          is_cancelled: subscriptionClasses?.subscription_status === 'cancelled'
        },
        credits: {
          balance: creditBalance?.total_credits || 0,
          classes_equivalent: 0, // No credit-to-class conversion
          rate: 'Credits are for subscription purchases only'
        },
        total_classes_available: subscriptionClasses?.subscription_classes || 0, // Only subscription classes
        recent_transactions: recentCredits,
        breakdown: {
          from_subscription: subscriptionClasses?.subscription_classes || 0,
          from_credits: 0, // No classes from credits
          total: subscriptionClasses?.subscription_classes || 0
        }
      }
    });

  } catch (error) {
    console.error('Get classes and credits error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/users/manage-classes - Manage user classes (admin only)
router.post('/manage-classes', authenticateToken, requireAdminOrReception, async (req, res) => {
  try {
    console.log('🎓 Debug: manage-classes endpoint hit');
    console.log('🎓 Debug: req.body:', req.body);
    
    const { userId, action, amount, reason, description } = req.body;

    console.log('🎓 Debug: Extracted values:');
    console.log('🎓 Debug: userId:', userId, typeof userId);
    console.log('🎓 Debug: action:', action, typeof action);
    console.log('🎓 Debug: amount:', amount, typeof amount);
    console.log('🎓 Debug: reason:', reason, typeof reason);

    if (!userId || !action || amount === undefined || amount === null || !reason) {
      console.log('🎓 Debug: Validation failed - missing required fields');
      return res.status(400).json({
        success: false,
        message: 'User ID, action, amount, and reason are required'
      });
    }

    // Validate amount is a valid non-negative number
    const numericAmount = parseInt(amount);
    if (isNaN(numericAmount) || numericAmount < 0) {
      console.log('🎓 Debug: Invalid amount - must be a non-negative number');
      return res.status(400).json({
        success: false,
        message: 'Amount must be a non-negative number'
      });
    }

    if (!['add', 'reset'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be either "add" or "reset"'
      });
    }

    const user = await db.get('SELECT id, name FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's current subscription (active or cancelled with remaining classes)
    const subscription = await db.get(`
      SELECT id, remaining_classes, status, plan_id
      FROM user_subscriptions 
      WHERE user_id = ? 
        AND (status = 'active' OR (status = 'cancelled' AND remaining_classes > 0))
      ORDER BY created_at DESC 
      LIMIT 1
    `, [userId]);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No active or valid subscription found for this user'
      });
    }

    const currentClasses = subscription.remaining_classes || 0;
    let newClassCount;

    if (action === 'add') {
      newClassCount = currentClasses + numericAmount;
    } else { // reset
      newClassCount = numericAmount;
    }

    // Update subscription's remaining classes
    await db.run(
      'UPDATE user_subscriptions SET remaining_classes = ? WHERE id = ?',
      [newClassCount, subscription.id]
    );

    console.log('🎓 Debug: Success - subscription classes managed successfully');
    console.log(`🎓 ${action === 'add' ? 'Added' : 'Reset'} classes for user ${user.name}: ${currentClasses} → ${newClassCount}`);

    res.json({
      success: true,
      message: `Classes ${action === 'add' ? 'added' : 'reset'} successfully`,
      data: {
        action,
        amount: numericAmount,
        previous_classes: currentClasses,
        new_classes: newClassCount,
        subscription_id: subscription.id,
        reason,
        description: description || null
      }
    });

  } catch (error) {
    console.error('🎓 Debug: Manage classes error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router; 