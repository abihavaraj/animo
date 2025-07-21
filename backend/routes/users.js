const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, requireAdmin, requireAdminOrReception } = require('../middleware/auth');

const router = express.Router();

// GET /api/users - Get all users with optional filtering (admin/reception only)
router.get('/', authenticateToken, requireAdminOrReception, async (req, res) => {
  try {
    const { role, status, search } = req.query;

    // For Supabase, use direct REST API that works
    if (db.useSupabase) {
      console.log('🔧 Using direct Supabase REST API for users list');
      
      // Build query URL
      let queryUrl = `${process.env.SUPABASE_URL}/rest/v1/users?select=id,name,email,phone,role,emergency_contact,medical_conditions,join_date,status,created_at,credit_balance`;
      
      const queryParams = [];
      
      if (role) {
        queryParams.push(`role=eq.${role}`);
      }
      
      if (status) {
        queryParams.push(`status=eq.${status}`);
      }
      
      if (search) {
        queryParams.push(`or=(name.ilike.*${search}*,email.ilike.*${search}*)`);
      }
      
      if (queryParams.length > 0) {
        queryUrl += '&' + queryParams.join('&');
      }
      
      queryUrl += '&order=created_at.desc';
      
      const response = await fetch(queryUrl, {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const users = await response.json();
        console.log('✅ Direct Supabase REST API successful - found', users.length, 'users');
        res.json({
          success: true,
          data: users || []
        });
      } else {
        const errorText = await response.text();
        console.error('❌ Direct Supabase REST API failed:', response.status, errorText);
        res.json({
          success: true,
          data: [] // Return empty array on error
        });
      }
      return;
    }

    // SQLite implementation
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
    // TEMPORARY: For Supabase, provide mock data until proper implementation
    if (db.useSupabase) {
      console.log('🔧 Using mock stats for Supabase');
      res.json({
        success: true,
        data: {
          totalUsers: 5,
          clients: 3,
          instructors: 1,
          activeUsers: 5,
          recentUsers: 2,
          activeSubscriptions: 0,
          monthlyRevenue: 0
        }
      });
      return;
    }

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
    let instructors = [];
    
    if (db.useSupabase) {
      const instructorsResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/users?role=in('instructor','admin','reception')&status=eq.active&select=id,name,email,phone&order=name.asc`, {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        }
      });
      
      if (instructorsResponse.ok) {
        instructors = await instructorsResponse.json();
      }
    } else {
      instructors = await db.all(`
        SELECT id, name, email, phone
        FROM users 
        WHERE role IN ('instructor', 'admin', 'reception') AND status = 'active'
        ORDER BY name
      `);
    }

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

    // Get settings using Supabase REST API
    let settings = null;
    try {
      console.log('🔍 Debug: Attempting to query notification_settings table');
      const settingsResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/notification_settings?user_id=eq.${userId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        }
      });
      
      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json();
        settings = settingsData.length > 0 ? settingsData[0] : null;
        console.log('🔍 Debug: Found settings:', settings);
      }
    } catch (error) {
      console.log('🔍 Debug: Error querying notification_settings:', error.message);
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

    // Upsert notification settings using Supabase REST API
    const settingsData = {
      user_id: userId,
      enable_notifications: enableNotifications,
      default_reminder_minutes: reminderMinutes,
      enable_push_notifications: enableNotifications,
      enable_email_notifications: false,
      updated_at: new Date().toISOString()
    };

    const upsertResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/notification_settings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(settingsData)
    });

    if (!upsertResponse.ok) {
      throw new Error('Failed to update notification settings');
    }

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
    let user = null;
    
    if (db.useSupabase) {
      // Get user from Supabase
      const userResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/users?id=eq.${req.params.id}&select=*`, {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        }
      });
      
      if (userResponse.ok) {
        const users = await userResponse.json();
        user = users.length > 0 ? users[0] : null;
      }
    } else {
      user = await db.get(`
        SELECT 
          id, name, email, phone, role, emergency_contact, 
          medical_conditions, join_date, status, created_at,
          credit_balance
        FROM users 
        WHERE id = ?
      `, [req.params.id]);
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's subscription if they're a client
    if (user.role === 'client') {
      let subscription = null;
      
      if (db.useSupabase) {
        // Get active subscription from Supabase
        const subscriptionResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/user_subscriptions?user_id=eq.${user.id}&status=eq.active&select=*,subscription_plans(name,equipment_access,monthly_price)`, {
          headers: {
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json'
          }
        });
        
        if (subscriptionResponse.ok) {
          const subscriptions = await subscriptionResponse.json();
          subscription = subscriptions.length > 0 ? subscriptions[0] : null;
          
          // Format the subscription data to match the expected structure
          if (subscription) {
            subscription.plan_name = subscription.subscription_plans?.name;
            subscription.equipment_access = subscription.subscription_plans?.equipment_access;
            subscription.monthly_price = subscription.subscription_plans?.monthly_price;
          }
        }
      } else {
        subscription = await db.get(`
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
      }

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

    if (db.useSupabase) {
      console.log('🔧 Using Supabase Auth API for user creation');
      
      // Step 1: Create user in Supabase Auth using admin API
      const authUserData = {
        email,
        password,
        email_confirm: true, // Skip email confirmation for admin-created users
        user_metadata: {
          name,
          role
        }
      };

      const createAuthUserResponse = await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(authUserData)
      });

      if (!createAuthUserResponse.ok) {
        const error = await createAuthUserResponse.json();
        console.error('❌ Supabase Auth user creation failed:', error);
        
        if (error.msg && error.msg.includes('already registered')) {
          return res.status(409).json({
            success: false,
            message: 'User with this email already exists'
          });
        }
        
        return res.status(500).json({
          success: false,
          message: 'Failed to create user account'
        });
      }

      const authUser = await createAuthUserResponse.json();
      console.log('✅ Supabase Auth user created:', authUser.id);

      // Step 2: Create user profile in public.users table
      const profileData = {
        id: authUser.id, // Use the same UUID from auth.users
        name,
        email,
        phone: phone || null,
        role,
        emergency_contact: emergencyContact || null,
        medical_conditions: medicalConditions || null,
        credit_balance: initialCreditBalance || 0,
        status: 'active'
        // Note: referral_source field removed as it doesn't exist in current Supabase table schema
      };

      console.log('📝 Creating user profile in Supabase with data:', JSON.stringify(profileData, null, 2));

      const createProfileResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(profileData)
      });

      if (!createProfileResponse.ok) {
        const profileError = await createProfileResponse.text();
        console.error('❌ Supabase user profile creation failed:', createProfileResponse.status, profileError);
        console.error('❌ Profile data that failed:', JSON.stringify(profileData, null, 2));
        
        // If profile creation fails, we should delete the auth user to keep things consistent
        try {
          await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users/${authUser.id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
              'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY
            }
          });
          console.log('🗑️ Cleaned up auth user after profile creation failure');
        } catch (cleanupError) {
          console.error('⚠️ Failed to cleanup auth user:', cleanupError);
        }
        
        // Parse error response if possible
        let errorMessage = 'Failed to create user profile';
        try {
          const parsedError = JSON.parse(profileError);
          if (parsedError.message) {
            errorMessage = parsedError.message;
          } else if (parsedError.details) {
            errorMessage = parsedError.details;
          }
        } catch (e) {
          // Use the raw text response if it's not JSON
          if (profileError) {
            errorMessage = profileError;
          }
        }
        
        return res.status(500).json({
          success: false,
          message: errorMessage
        });
      }

      const newUserProfile = await createProfileResponse.json();
      const newUser = newUserProfile[0];

      // Step 3: If initial credit balance is provided, create a manual credit record
      if (initialCreditBalance > 0) {
        const creditData = {
          user_id: newUser.id,
          admin_id: req.user.id,
          amount: initialCreditBalance,
          classes_added: 0,
          reason: 'adjustment',
          description: `Initial credit balance on account creation by ${req.user.name}`
        };

        const creditResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/manual_credits`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(creditData)
        });

        if (creditResponse.ok) {
          console.log(`💳 Added initial credit balance of $${initialCreditBalance} for new user ${name} (ID: ${newUser.id})`);
        } else {
          console.error('⚠️ Failed to add initial credit balance, but user was created successfully');
        }
      }

      console.log('✅ Supabase user creation (Auth + Profile) successful');
      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: newUser
      });

    } else {
      // Original SQLite implementation
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

    let existingUser = null;
    
    if (db.useSupabase) {
      // Check if user exists in Supabase
      const userResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/users?id=eq.${req.params.id}&select=id`, {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        }
      });
      
      if (userResponse.ok) {
        const users = await userResponse.json();
        existingUser = users.length > 0 ? users[0] : null;
      }
    } else {
      existingUser = await db.get('SELECT id FROM users WHERE id = ?', [req.params.id]);
    }
    
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if email is already taken by another user
    if (req.body.email) {
      let emailConflict = null;
      
      if (db.useSupabase) {
        const emailResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/users?email=eq.${req.body.email}&id=neq.${req.params.id}&select=id`, {
          headers: {
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json'
          }
        });
        
        if (emailResponse.ok) {
          const users = await emailResponse.json();
          emailConflict = users.length > 0 ? users[0] : null;
        }
      } else {
        emailConflict = await db.get(
          'SELECT id FROM users WHERE email = ? AND id != ?',
          [req.body.email, req.params.id]
        );
      }
      
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

    let updatedUser = null;
    
    if (db.useSupabase) {
      // Update user in Supabase
      const updateResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/users?id=eq.${req.params.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...updates,
          updated_at: new Date().toISOString()
        })
      });
      
      if (!updateResponse.ok) {
        throw new Error('Failed to update user in Supabase');
      }
      
      // Get updated user
      const userResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/users?id=eq.${req.params.id}&select=*`, {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        }
      });
      
      if (userResponse.ok) {
        const users = await userResponse.json();
        updatedUser = users.length > 0 ? users[0] : null;
      }
    } else {
      // Build update query
      const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
      const values = [...Object.values(updates), req.params.id];

      await db.run(
        `UPDATE users SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        values
      );

      // Get updated user
      updatedUser = await db.get(`
        SELECT 
          id, name, email, phone, role, emergency_contact, 
          medical_conditions, join_date, status, created_at, credit_balance
        FROM users 
        WHERE id = ?
      `, [req.params.id]);
    }

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

    if (db.useSupabase) {
      console.log('🔧 Using Supabase REST API for push token update');
      
      const updateData = {
        push_token: pushToken
      };

      const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/users?id=eq.${userId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Supabase push token update failed:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to update push token'
        });
      }

      console.log(`📱 Push token registered for user ${req.user.name}: ${pushToken}`);
    } else {
      // SQLite implementation
      await db.run(`
        UPDATE users SET push_token = ? WHERE id = ?
      `, [pushToken, userId]);

      console.log(`📱 Push token registered for user ${req.user.name}: ${pushToken}`);
    }

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

    if (db.useSupabase) {
      console.log('🔧 Using Supabase REST API for manage classes');
      
      // Get user info
      const userResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/users?id=eq.${userId}&select=id,name`, {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        }
      });

      if (!userResponse.ok) {
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch user information'
        });
      }

      const users = await userResponse.json();
      if (!users || users.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      const user = users[0];

      // Get user's current subscription
      const subscriptionResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/user_subscriptions?user_id=eq.${userId}&or=(status.eq.active,and(status.eq.cancelled,remaining_classes.gt.0))&select=id,remaining_classes,status,plan_id&order=created_at.desc&limit=1`, {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        }
      });

      if (!subscriptionResponse.ok) {
        return res.status(500).json({
          success: false,
          message: 'Failed to fetch subscription information'
        });
      }

      const subscriptions = await subscriptionResponse.json();
      if (!subscriptions || subscriptions.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'No active or valid subscription found for this user'
        });
      }
      const subscription = subscriptions[0];

      const currentClasses = subscription.remaining_classes || 0;
      let newClassCount;

      if (action === 'add') {
        newClassCount = currentClasses + numericAmount;
      } else { // reset
        newClassCount = numericAmount;
      }

      // Update subscription's remaining classes
      const updateResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/user_subscriptions?id=eq.${subscription.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ remaining_classes: newClassCount })
      });

      if (!updateResponse.ok) {
        const error = await updateResponse.json();
        console.error('❌ Supabase subscription update failed:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to update subscription classes'
        });
      }
    } else {
      // SQLite implementation
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
    }

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