const express = require('express');
const { body, validationResult } = require('express-validator');
const moment = require('moment');
const db = require('../config/database');
const { authenticateToken, requireAdmin, requireAdminOrReception, requireOwnershipOrAdmin } = require('../middleware/auth');
const subscriptionNotificationService = require('../services/subscriptionNotificationService');
const SimpleDateCalculator = require('../utils/simpleDateCalculator');

const router = express.Router();

// Helper function to update expired subscriptions
async function updateExpiredSubscriptions() {
  try {
    const today = moment().format('YYYY-MM-DD');
    
    if (db.useSupabase) {
      // Update expired subscriptions using Supabase - IMPROVED LOGIC!
      // Expire subscriptions that end today/earlier OR have 0 remaining classes
      const updateResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/user_subscriptions?status=eq.active&or=(end_date.lte.${today},remaining_classes.eq.0)`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          status: 'expired',
          updated_at: new Date().toISOString()
        })
      });

      if (updateResponse.ok) {
        // Get count of updated subscriptions
        const countResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/user_subscriptions?end_date=lt.${today}&status=eq.expired&select=id&updated_at=gte.${new Date().toISOString().split('T')[0]}`, {
          headers: {
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json'
          }
        });

        if (countResponse.ok) {
          const count = await countResponse.json();
          if (count.length > 0) {
            console.log(`🔄 Auto-updated ${count.length} expired subscriptions`);
          }
        }
      } else {
        console.error('Failed to update expired subscriptions in Supabase');
      }
    } else {
      // SQLite fallback
      const result = await db.run(
        'UPDATE user_subscriptions SET status = "expired" WHERE DATE(end_date) < ? AND status = "active"',
        [today]
      );

      if (result.changes > 0) {
        console.log(`🔄 Auto-updated ${result.changes} expired subscriptions`);
      }
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
    
    if (db.useSupabase) {
      // Build Supabase query with filters
      let queryUrl = `${process.env.SUPABASE_URL}/rest/v1/user_subscriptions?select=*,subscription_plans!inner(name,equipment_access,monthly_price,category,duration_months),users!inner(name,email)`;
      
      const queryParams = [];
      
      // Apply user filtering
      if (req.user.role !== 'admin' && req.user.role !== 'reception') {
        queryParams.push(`user_id=eq.${req.user.id}`);
      } else if (userId) {
        queryParams.push(`user_id=eq.${userId}`);
      }

      if (status) {
        queryParams.push(`status=eq.${status}`);
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
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Supabase error response (GET subscriptions):', errorText);
        throw new Error('Failed to fetch subscriptions');
      }
      
      const subscriptions = await response.json();
      
      // Process and format the response
      const today = new Date().toISOString().split('T')[0];
      const updatedSubscriptions = (subscriptions || []).map(sub => {
        // Check if subscription should be expired
        const isExpired = sub.end_date < today && sub.status === 'active';
        
        return {
          ...sub,
          plan_name: sub.subscription_plans.name,
          equipment_access: sub.subscription_plans.equipment_access,
          monthly_price: sub.subscription_plans.monthly_price,
          category: sub.subscription_plans.category,
          duration_months: sub.subscription_plans.duration_months,
          user_name: sub.users.name,
          user_email: sub.users.email,
          status: isExpired ? 'expired' : sub.status,
          actual_status: isExpired ? 'expired' : sub.status
        };
      });

      res.json({
        success: true,
        data: updatedSubscriptions
      });

    } else {
      // SQLite fallback
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
    }

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
    
    if (db.useSupabase) {
      // Build Supabase query for current subscription
      const currentDate = new Date().toISOString().split('T')[0];
      let queryUrl = `${process.env.SUPABASE_URL}/rest/v1/user_subscriptions?user_id=eq.${req.user.id}&end_date=gte.${currentDate}&select=*,subscription_plans!inner(name,equipment_access,monthly_price,monthly_classes,category,features,duration_months)&order=created_at.desc&limit=1`;

      // Add status filter for active or cancelled with remaining classes
      queryUrl += `&or=(status.eq.active,and(status.eq.cancelled,remaining_classes.gt.0))`;

      const subscriptionResponse = await fetch(queryUrl, {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        }
      });

      if (!subscriptionResponse.ok) {
        const errorText = await subscriptionResponse.text();
        console.error('❌ Supabase error response (GET current subscription):', errorText);
        // Don't throw error, just return null subscription
        return res.json({
          success: true,
          data: null
        });
      }

      const subscriptionData = await subscriptionResponse.json();
      
      let subscription = null;
      if (subscriptionData.length > 0) {
        const sub = subscriptionData[0];
        subscription = {
          ...sub,
          plan_name: sub.subscription_plans?.name,
          equipment_access: sub.subscription_plans?.equipment_access,
          monthly_price: sub.subscription_plans?.monthly_price,
          monthly_classes: sub.subscription_plans?.monthly_classes,
          category: sub.subscription_plans?.category,
          features: sub.subscription_plans?.features ? JSON.parse(sub.subscription_plans.features) : null,
          duration_months: sub.subscription_plans?.duration_months
        };
      }

      res.json({
        success: true,
        data: subscription
      });

    } else {
      // SQLite fallback
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

      res.json({
        success: true,
        data: subscription
      });
    }

  } catch (error) {
    console.error('Get current subscription error:', error);
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
    
    // Build Supabase query parameters for total assignments
    let queryParams = new URLSearchParams();
    queryParams.append('reason', 'eq.promotional');
    queryParams.append('description', 'like.*subscription assigned*');
    queryParams.append('select', 'id');
    
    if (adminId) {
      queryParams.append('admin_id', `eq.${adminId}`);
    }
    
    if (dateFrom) {
      queryParams.append('created_at', `gte.${dateFrom}`);
    }
    
    if (dateTo) {
      queryParams.append('created_at', `lte.${dateTo}`);
    }
    
    // Get total assignments using Supabase REST API
    const totalAssignmentsResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/manual_credits?${queryParams.toString()}`, {
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    let totalAssignments = { count: 0 };
    if (totalAssignmentsResponse.ok) {
      const totalAssignmentsData = await totalAssignmentsResponse.json();
      totalAssignments = { count: totalAssignmentsData.length };
    }
    
    // Get assignments by admin using Supabase REST API
    const assignmentsByAdminResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/manual_credits?reason=eq.promotional&description=like.*subscription assigned*&select=admin_id,classes_added,users!manual_credits_admin_id_fkey(name,role)`, {
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    let assignmentsByAdmin = [];
    if (assignmentsByAdminResponse.ok) {
      const assignmentsByAdminData = await assignmentsByAdminResponse.json();
      
      // Process the data to group by admin
      const adminCounts = {};
      assignmentsByAdminData.forEach(assignment => {
        const adminName = assignment.users?.name || 'Unknown';
        const adminRole = assignment.users?.role || 'Unknown';
        const key = `${adminName}-${adminRole}`;
        
        if (!adminCounts[key]) {
          adminCounts[key] = {
            admin_name: adminName,
            admin_role: adminRole,
            assignment_count: 0,
            total_classes_assigned: 0
          };
        }
        
        adminCounts[key].assignment_count++;
        adminCounts[key].total_classes_assigned += (assignment.classes_added || 0);
      });
      
      assignmentsByAdmin = Object.values(adminCounts).sort((a, b) => b.assignment_count - a.assignment_count);
    }
    
    // Get assignments by month using Supabase REST API
    const assignmentsByMonthResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/manual_credits?reason=eq.promotional&description=like.*subscription assigned*&select=created_at,classes_added&order=created_at.desc`, {
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    let assignmentsByMonth = [];
    if (assignmentsByMonthResponse.ok) {
      const assignmentsByMonthData = await assignmentsByMonthResponse.json();
      
      // Process the data to group by month
      const monthCounts = {};
      assignmentsByMonthData.forEach(assignment => {
        const date = new Date(assignment.created_at);
        const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthCounts[month]) {
          monthCounts[month] = {
            month,
            assignment_count: 0,
            classes_assigned: 0
          };
        }
        
        monthCounts[month].assignment_count++;
        monthCounts[month].classes_assigned += (assignment.classes_added || 0);
      });
      
      assignmentsByMonth = Object.values(monthCounts)
        .sort((a, b) => b.month.localeCompare(a.month))
        .slice(0, 12);
    }

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

// GET /api/subscriptions/assignments - Get assignment history for admin (admin/reception only)
router.get('/assignments', authenticateToken, requireAdminOrReception, async (req, res) => {
  try {
    console.log('🔍 Assignments endpoint hit with query:', req.query);
    const { adminId, userId, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    
    // Build Supabase query parameters
    let queryParams = new URLSearchParams();
    queryParams.append('reason', 'eq.promotional');
    queryParams.append('description', 'like.*subscription assigned*');
    queryParams.append('select', '*,users!manual_credits_user_id_fkey(name,email)');
    queryParams.append('order', 'created_at.desc');
    queryParams.append('limit', limit.toString());
    queryParams.append('offset', offset.toString());
    
    // Add filters
    if (adminId) {
      queryParams.append('admin_id', `eq.${adminId}`);
    }
    
    if (userId) {
      queryParams.append('user_id', `eq.${userId}`);
    }
    
    // Fetch assignments using Supabase REST API
    console.log('🔍 Fetching assignments with URL:', `${process.env.SUPABASE_URL}/rest/v1/manual_credits?${queryParams.toString()}`);
    const assignmentsResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/manual_credits?${queryParams.toString()}`, {
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('🔍 Assignments response status:', assignmentsResponse.status);
    if (!assignmentsResponse.ok) {
      const errorText = await assignmentsResponse.text();
      console.error('🔍 Assignments response error:', errorText);
      throw new Error(`Failed to fetch assignments: ${assignmentsResponse.status} ${errorText}`);
    }
    
    const assignmentsData = await assignmentsResponse.json();
    
    // Process the data to match expected format
    const assignments = assignmentsData.map(item => ({
      id: item.id,
      user_id: item.user_id,
      admin_id: item.admin_id,
      classes_added: item.classes_added,
      description: item.description,
      created_at: item.created_at,
      client_name: item.users?.name || 'Unknown',
      client_email: item.users?.email || 'Unknown',
      admin_name: 'Reception User', // Default admin name
      admin_role: 'reception', // Default admin role
      subscription_id: null, // Will be filled if needed
      plan_name: 'Manual Assignment',
      monthly_price: 0,
      subscription_status: 'active'
    }));

    // Get total count for pagination
    let countParams = new URLSearchParams();
    countParams.append('reason', 'eq.promotional');
    countParams.append('description', 'like.*subscription assigned*');
    countParams.append('select', 'id');
    
    if (adminId) {
      countParams.append('admin_id', `eq.${adminId}`);
    }
    
    if (userId) {
      countParams.append('user_id', `eq.${userId}`);
    }
    
    const countResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/manual_credits?${countParams.toString()}`, {
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    let total = 0;
    if (countResponse.ok) {
      const countData = await countResponse.json();
      total = countData.length;
    }

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

// GET /api/subscriptions/:id - Get single subscription
router.get('/:id', authenticateToken, requireOwnershipOrAdmin, async (req, res) => {
  try {
    // Fetch subscription using Supabase REST API
    const subscriptionResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/user_subscriptions?id=eq.${req.params.id}&select=*,subscription_plans(name,equipment_access,monthly_price,category,features),users(name,email)`, {
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!subscriptionResponse.ok) {
      throw new Error('Failed to fetch subscription');
    }

    const subscriptionData = await subscriptionResponse.json();

    if (subscriptionData.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found'
      });
    }

    const sub = subscriptionData[0];
    const subscription = {
      ...sub,
      plan_name: sub.subscription_plans?.name,
      equipment_access: sub.subscription_plans?.equipment_access,
      monthly_price: sub.subscription_plans?.monthly_price,
      category: sub.subscription_plans?.category,
      features: sub.subscription_plans?.features ? JSON.parse(sub.subscription_plans.features) : null,
      user_name: sub.users?.name,
      user_email: sub.users?.email
    };
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
  body('planId').notEmpty().withMessage('Valid plan ID is required'),
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

    if (db.useSupabase) {
      // SUPABASE IMPLEMENTATION
      console.log('🔄 Using Supabase for subscription purchase');
      
      // Get the plan from Supabase
      const planResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/subscription_plans?id=eq.${planId}&is_active=eq.true&select=*`, {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        }
      });

      if (!planResponse.ok) {
        throw new Error('Failed to fetch plan from Supabase');
      }

      const plans = await planResponse.json();
      if (!plans || plans.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Plan not found or inactive'
        });
      }

      const plan = plans[0];

      // Check user credit balance in Supabase
      const userResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/users?id=eq.${req.user.id}&select=credit_balance`, {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        }
      });

      if (!userResponse.ok) {
        throw new Error('Failed to fetch user from Supabase');
      }

      const users = await userResponse.json();
      const user = users[0];
      
      if (!user || (user.credit_balance || 0) < plan.monthly_price) {
        return res.status(400).json({
          success: false,
          message: `Insufficient credit balance. Required: ${plan.monthly_price} ALL, Available: ${user?.credit_balance || 0} ALL. Please add credits to your account before purchasing a subscription.`
        });
      }

      // Check if user already has an active subscription
      const existingSubResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/user_subscriptions?user_id=eq.${req.user.id}&status=eq.active&select=id,remaining_classes`, {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        }
      });

      if (!existingSubResponse.ok) {
        throw new Error('Failed to check existing subscriptions');
      }

      const existingSubscriptions = await existingSubResponse.json();
      const existingSubscription = existingSubscriptions.length > 0 ? existingSubscriptions[0] : null;

      try {
        // If user has an existing active subscription, cancel it first
        if (existingSubscription) {
          console.log(`🔄 Cancelling existing subscription ${existingSubscription.id} for user ${req.user.id}`);
          
          const cancelResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/user_subscriptions?id=eq.${existingSubscription.id}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
              'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              status: 'cancelled',
              remaining_classes: 0,
              updated_at: new Date().toISOString()
            })
          });

          if (!cancelResponse.ok) {
            throw new Error('Failed to cancel existing subscription');
          }

          // Log the cancellation activity
          const activityResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/client_activity_log`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
              'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              client_id: req.user.id,
              activity_type: 'subscription_cancellation',
              description: `Previous subscription cancelled to start new subscription. ${existingSubscription.remaining_classes > 0 ? `${existingSubscription.remaining_classes} remaining classes cleared.` : ''}`,
              performed_by: req.user.id
            })
          });

          if (!activityResponse.ok) {
            console.warn('Failed to log cancellation activity (non-critical)');
          }
        }

        // Calculate start and end dates
        const startDate = SimpleDateCalculator.toStorageFormat(new Date());
        const endDate = SimpleDateCalculator.calculateEndDate(new Date(), plan.duration, plan.duration_unit);

        // Create new subscription in Supabase
        console.log('🔄 Creating new subscription in Supabase');
        const createSubResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/user_subscriptions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            user_id: req.user.id,
            plan_id: planId,
            remaining_classes: plan.monthly_classes,
            start_date: startDate,
            end_date: endDate,
            status: 'active'
          })
        });

        if (!createSubResponse.ok) {
          const errorText = await createSubResponse.text();
          throw new Error(`Failed to create subscription: ${errorText}`);
        }

        const newSubscriptions = await createSubResponse.json();
        const newSubscription = newSubscriptions[0];
        
        if (!newSubscription) {
          throw new Error('Failed to create subscription: No data returned');
        }

        console.log('✅ Subscription created successfully:', newSubscription.id);

        // Always use credit for subscription purchases
        const actualPaymentMethod = 'credit';
        
        // Update user credit balance in Supabase
        console.log('🔄 Updating user credit balance in Supabase');
        const updateBalanceResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/users?id=eq.${req.user.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            credit_balance: user.credit_balance - plan.monthly_price
          })
        });

        if (!updateBalanceResponse.ok) {
          throw new Error('Failed to update user balance');
        }

        // Record the credit usage in manual_credits table
        console.log('🔄 Recording credit usage in Supabase');
        const creditResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/manual_credits`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            user_id: req.user.id,
            admin_id: req.user.id,
            amount: -plan.monthly_price,
            classes_added: 0,
            reason: 'subscription_purchase',
            description: `Credit used for ${plan.name} subscription`
          })
        });

        if (!creditResponse.ok) {
          console.warn('Failed to record credit usage (non-critical)');
        }

        console.log(`💳 Used ${plan.monthly_price} ALL credit for subscription purchase by user ${req.user.id}`);

        // **CRITICAL FIX: Create payment record in Supabase**
        console.log('🔄 Creating payment record in Supabase');
        const generateUUID = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
        
        const paymentResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/payments`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            user_id: req.user.id,
            subscription_id: generateUUID(), // Use placeholder UUID due to schema mismatch
            amount: plan.monthly_price,
            payment_method: actualPaymentMethod,
            status: 'completed'
          })
        });

        if (!paymentResponse.ok) {
          const errorText = await paymentResponse.text();
          console.error('❌ Failed to create payment record:', errorText);
          // Don't fail the whole transaction for payment record creation
        } else {
          console.log('✅ Payment record created successfully');
        }

        // Get the created subscription with plan details
        const fullSubResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/user_subscriptions?id=eq.${newSubscription.id}&select=*,subscription_plans(*)`, {
          headers: {
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json'
          }
        });

        let fullSubscription = newSubscription;
        if (fullSubResponse.ok) {
          const fullSubs = await fullSubResponse.json();
          if (fullSubs.length > 0) {
            const sub = fullSubs[0];
            fullSubscription = {
              ...sub,
              plan_name: sub.subscription_plans?.name,
              equipment_access: sub.subscription_plans?.equipment_access,
              monthly_price: sub.subscription_plans?.monthly_price,
              category: sub.subscription_plans?.category
            };
          }
        }

        const message = existingSubscription ? 
          'Subscription upgraded successfully' : 
          'Subscription purchased successfully';

        const responseData = {
          subscription: fullSubscription,
          credit_used: plan.monthly_price,
          remaining_credit_balance: user.credit_balance - plan.monthly_price
        };

        console.log('✅ Subscription purchase completed successfully');
        res.status(201).json({
          success: true,
          message: message,
          data: responseData
        });

      } catch (supabaseError) {
        console.error('❌ Supabase subscription purchase error:', supabaseError);
        throw supabaseError;
      }

    } else {
      // SQLITE IMPLEMENTATION (existing code)
      console.log('🔄 Using SQLite for subscription purchase');
      
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

      // Calculate start and end dates - SIMPLE!
      const startDate = SimpleDateCalculator.toStorageFormat(new Date());
      const endDate = SimpleDateCalculator.calculateEndDate(new Date(), plan.duration, plan.duration_unit);

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
    
    if (db.useSupabase) {
      // Get subscription using Supabase
      const subscriptionResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/user_subscriptions?id=eq.${req.params.id}&select=*`, {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        }
      });

      if (!subscriptionResponse.ok) {
        throw new Error('Failed to fetch subscription');
      }

      const subscriptions = await subscriptionResponse.json();
      if (subscriptions.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Subscription not found'
        });
      }

      const subscription = subscriptions[0];

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

      // Update subscription using Supabase
      const updateResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/user_subscriptions?id=eq.${req.params.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'cancelled',
          remaining_classes: 0,
          updated_at: new Date().toISOString()
        })
      });

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error('❌ Supabase error response (UPDATE subscription):', errorText);
        throw new Error('Failed to cancel subscription');
      }

      // Log the cancellation activity using Supabase
      const activityResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/client_activity_log`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: subscription.user_id,
          activity_type: 'subscription_cancellation',
          description: `Subscription cancelled by ${req.user.role}. ${subscription.remaining_classes > 0 ? `${subscription.remaining_classes} remaining classes cleared.` : ''} Reason: ${reason}`,
          performed_by: req.user.id,
          created_at: new Date().toISOString()
        })
      });

      if (!activityResponse.ok) {
        console.error('❌ Failed to log cancellation activity');
      }

      // Create notification for the user if cancelled by admin/reception (not self-cancellation)
      if (req.user.role === 'admin' || req.user.role === 'reception') {
        try {
          await subscriptionNotificationService.createSubscriptionChangeNotification(
            subscription.user_id,
            'cancelled',
            `Reason: ${reason}`,
            req.user.id
          );
        } catch (notificationError) {
          console.error('Error creating cancellation notification:', notificationError);
        }
      }

      // Cancel any scheduled notifications for future bookings from this subscription using Supabase
      try {
        // First get bookings with this subscription
        const bookingsResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/bookings?subscription_id=eq.${req.params.id}&status=eq.confirmed&select=class_id`, {
          headers: {
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json'
          }
        });

        if (bookingsResponse.ok) {
          const bookings = await bookingsResponse.json();
          const classIds = bookings.map(b => b.class_id);

          if (classIds.length > 0) {
            // Delete notifications for these classes
            const deleteNotificationsResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/notifications?user_id=eq.${subscription.user_id}&sent=eq.false&class_id=in.(${classIds.join(',')})`, {
              method: 'DELETE',
              headers: {
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
                'Content-Type': 'application/json'
              }
            });

            if (deleteNotificationsResponse.ok) {
              console.log(`📱 Cancelled scheduled notifications for cancelled subscription ${req.params.id}`);
            }
          }
        }
      } catch (notificationError) {
        console.error('Error cancelling notifications for cancelled subscription:', notificationError);
        // Don't fail subscription cancellation if notification cleanup fails
      }

    } else {
      // SQLite fallback
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
    
    if (db.useSupabase) {
      // Get subscription using Supabase REST API
      const subscriptionResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/user_subscriptions?id=eq.${req.params.id}&select=*`, {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        }
      });

      if (!subscriptionResponse.ok) {
        throw new Error('Failed to fetch subscription');
      }

      const subscriptions = await subscriptionResponse.json();
      if (subscriptions.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Subscription not found'
        });
      }

      const subscription = subscriptions[0];

      if (subscription.status !== 'active') {
        return res.status(400).json({
          success: false,
          message: 'Only active subscriptions can be paused'
        });
      }

      // Calculate new end date by extending it by pause days
      const currentEndDate = moment(subscription.end_date);
      const newEndDate = currentEndDate.add(pauseDays, 'days').format('YYYY-MM-DD');

      // Update subscription using Supabase REST API
      const updateResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/user_subscriptions?id=eq.${req.params.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'paused',
          end_date: newEndDate,
          updated_at: new Date().toISOString()
        })
      });

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error('❌ Supabase error response (PAUSE subscription):', errorText);
        throw new Error('Failed to update subscription');
      }

      // Log the pause activity using Supabase REST API
      const activityResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/client_activity_log`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: subscription.user_id,
          activity_type: 'subscription_paused',
          description: `Subscription paused for ${pauseDays} days by ${req.user.name} (${req.user.role}). Reason: ${reason}. New end date: ${newEndDate}`,
          performed_by: req.user.id,
          created_at: new Date().toISOString()
        })
      });

      if (!activityResponse.ok) {
        console.error('⚠️ Failed to log pause activity');
      }

      // Create notification for the user
      try {
        await subscriptionNotificationService.createSubscriptionChangeNotification(
          subscription.user_id,
          'paused',
          `Paused for ${pauseDays} days. End date extended to: ${newEndDate}`,
          req.user.id
        );
      } catch (notificationError) {
        console.error('⚠️ Notification creation error:', notificationError);
      }

      res.json({
        success: true,
        message: `Subscription paused for ${pauseDays} days successfully`,
        data: {
          pauseDays,
          newEndDate,
          reason
        }
      });

    } else {
      // SQLite implementation
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
    }

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
    
    if (db.useSupabase) {
      // Get subscription using Supabase REST API
      const subscriptionResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/user_subscriptions?id=eq.${req.params.id}&select=*`, {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        }
      });

      if (!subscriptionResponse.ok) {
        throw new Error('Failed to fetch subscription');
      }

      const subscriptions = await subscriptionResponse.json();
      if (subscriptions.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Subscription not found'
        });
      }

      const subscription = subscriptions[0];

      if (subscription.status !== 'paused') {
        return res.status(400).json({
          success: false,
          message: 'Only paused subscriptions can be resumed'
        });
      }

      // Update subscription using Supabase REST API
      const updateResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/user_subscriptions?id=eq.${req.params.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'active',
          updated_at: new Date().toISOString()
        })
      });

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error('❌ Supabase error response (RESUME subscription):', errorText);
        throw new Error('Failed to update subscription');
      }

      // Log the resume activity using Supabase REST API
      const activityResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/client_activity_log`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: subscription.user_id,
          activity_type: 'subscription_resumed',
          description: `Subscription resumed by ${req.user.name} (${req.user.role}). Reason: ${reason}`,
          performed_by: req.user.id,
          created_at: new Date().toISOString()
        })
      });

      if (!activityResponse.ok) {
        console.error('⚠️ Failed to log resume activity');
      }

      // Create notification for the user
      try {
        await subscriptionNotificationService.createSubscriptionChangeNotification(
          subscription.user_id,
          'resumed',
          `Your subscription has been resumed.`,
          req.user.id
        );
      } catch (notificationError) {
        console.error('⚠️ Notification creation error:', notificationError);
      }

      res.json({
        success: true,
        message: 'Subscription resumed successfully'
      });

    } else {
      // SQLite implementation
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
    }

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
  body('userId').notEmpty().withMessage('Valid user ID is required'),
  body('planId').notEmpty().withMessage('Valid plan ID is required')
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

    // Declare variables at function scope
    let newPlan, user, existingSubscription;

    if (db.useSupabase) {
      // Use Supabase REST API for all database operations
      
      // Get the new plan using REST API
      const planResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/subscription_plans?id=eq.${planId}&is_active=eq.true&select=*`, {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        }
      });

      if (!planResponse.ok) {
        return res.status(404).json({
          success: false,
          message: 'Plan not found or inactive'
        });
      }

      const plans = await planResponse.json();
      if (plans.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Plan not found or inactive'
        });
      }
      newPlan = plans[0];

      // Get the user using REST API
      const userResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/users?id=eq.${userId}&select=id,name,email`, {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        }
      });

      if (!userResponse.ok) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const users = await userResponse.json();
      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      user = users[0];

      // Check if user has existing active subscription using REST API
      const subscriptionResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/user_subscriptions?user_id=eq.${userId}&status=eq.active&end_date=gte.${new Date().toISOString().split('T')[0]}&select=*,subscription_plans!inner(name,monthly_price,monthly_classes,equipment_access)&order=created_at.desc&limit=1`, {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        }
      });

      if (subscriptionResponse.ok) {
        const existingSubscriptions = await subscriptionResponse.json();
        existingSubscription = existingSubscriptions.length > 0 ? {
          ...existingSubscriptions[0],
          plan_name: existingSubscriptions[0].subscription_plans.name,
          monthly_price: existingSubscriptions[0].subscription_plans.monthly_price,
          monthly_classes: existingSubscriptions[0].subscription_plans.monthly_classes,
          equipment_access: existingSubscriptions[0].subscription_plans.equipment_access
        } : null;
      } else {
        existingSubscription = null;
      }

    } else {
      // SQLite fallback
      // Get the new plan
      newPlan = await db.get('SELECT * FROM subscription_plans WHERE id = ? AND is_active = 1', [planId]);
      if (!newPlan) {
        return res.status(404).json({
          success: false,
          message: 'Plan not found or inactive'
        });
      }

      // Get the user
      user = await db.get('SELECT name, email FROM users WHERE id = ?', [userId]);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if user has existing active subscription
      existingSubscription = await db.get(`
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
    }

    if (!existingSubscription) {
      // No existing subscription, safe to proceed
      console.log('[CHECK-EXISTING] No active subscription found for user', userId);
      return res.json({
        success: true,
        data: {
          hasExistingSubscription: false,
          canProceed: true,
          user: user,
          newPlan: newPlan,
          message: 'No existing subscription found. Safe to assign new subscription.',
          options: [] // Always include options for frontend consistency
        }
      });
    }
    // If we get here, there is an existing subscription
    console.log('[CHECK-EXISTING] Active subscription found for user', userId, 'Subscription:', existingSubscription);

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

    console.log('[CHECK-EXISTING] Returning options:', options);
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
  body('userId').notEmpty().withMessage('Valid user ID is required'),
  body('planId').notEmpty().withMessage('Valid plan ID is required'),
  body('paymentMethod').optional().isString().withMessage('Payment method must be string'),
  body('action').optional().isIn(['new', 'extend', 'queue']).withMessage('Action must be "new", "extend", or "queue"')
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

    // Declare variables at function scope
    let plan, user;

    if (db.useSupabase) {
      // Use Supabase REST API for all database operations
      
      // Get the plan using REST API
      const planResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/subscription_plans?id=eq.${planId}&is_active=eq.true&select=*`, {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        }
      });

      if (!planResponse.ok) {
        return res.status(404).json({
          success: false,
          message: 'Plan not found or inactive'
        });
      }

      const plans = await planResponse.json();
      if (plans.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Plan not found or inactive'
        });
      }
      plan = plans[0];

      // Get the user using REST API
      const userResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/users?id=eq.${userId}&select=*`, {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        }
      });

      if (!userResponse.ok) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      const users = await userResponse.json();
      if (users.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      user = users[0];

    } else {
      // SQLite fallback
      // Get the plan
      plan = await db.get('SELECT * FROM subscription_plans WHERE id = ? AND is_active = 1', [planId]);
      if (!plan) {
        return res.status(404).json({
          success: false,
          message: 'Plan not found or inactive'
        });
      }

      // Get the user
      user = await db.get('SELECT * FROM users WHERE id = ?', [userId]);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
    }

    let existingSubscription = null;

    if (db.useSupabase) {
      // Check for existing active subscription if action is 'new'
      if (action === 'new') {
        const existingActiveResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/user_subscriptions?user_id=eq.${userId}&status=eq.active&end_date=gte.${new Date().toISOString().split('T')[0]}&select=id&limit=1`, {
          headers: {
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json'
          }
        });

        if (existingActiveResponse.ok) {
          const existingActive = await existingActiveResponse.json();
          if (existingActive && existingActive.length > 0) {
            return res.status(400).json({ success: false, message: 'User already has an active subscription. Use extend or cancel existing first.' });
          }
        }
      }

      // Check if user already has an active subscription
      const existingSubscriptionsResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/user_subscriptions?user_id=eq.${userId}&status=eq.active&end_date=gte.${new Date().toISOString().split('T')[0]}&select=*,subscription_plans!inner(name,monthly_price)&limit=1`, {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        }
      });

      if (existingSubscriptionsResponse.ok) {
        const existingSubscriptions = await existingSubscriptionsResponse.json();
        if (existingSubscriptions && existingSubscriptions.length > 0) {
          existingSubscription = {
            ...existingSubscriptions[0],
            existing_plan_name: existingSubscriptions[0].subscription_plans.name,
            existing_monthly_price: existingSubscriptions[0].subscription_plans.monthly_price
          };
        }
      }

    } else {
      // SQLite fallback - this should not be reached when using Supabase
      console.warn('⚠️ Raw SQL not supported in Supabase. Use direct table operations instead.');
      return res.status(500).json({ 
        success: false, 
        message: 'Database configuration error. Please contact administrator.' 
      });
    }

    try {
      let resultSubscription;
      let paymentAmount = 0;
      let operationType = '';

      if (existingSubscription && action === 'extend') {
        // EXTEND EXISTING SUBSCRIPTION
        paymentAmount = plan.monthly_price;
        const newRemainingClasses = existingSubscription.remaining_classes + plan.monthly_classes;
        
        if (db.useSupabase) {
          // Update subscription with REST API
          const updateResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/user_subscriptions?id=eq.${existingSubscription.id}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
              'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              remaining_classes: newRemainingClasses,
              updated_at: new Date().toISOString()
            })
          });

          if (!updateResponse.ok) {
            throw new Error('Failed to update subscription');
          }

          // Create payment record with placeholder UUID (due to schema mismatch)
          const generateUUID = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
          
          const paymentResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/payments`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
              'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              user_id: userId,
              subscription_id: generateUUID(), // Use placeholder UUID due to schema mismatch
              amount: paymentAmount,
              payment_date: moment().format('YYYY-MM-DD'),
              payment_method: paymentMethod,
              status: 'completed'
            })
          });

          if (!paymentResponse.ok) {
            console.error('Payment record error:', await paymentResponse.text());
          }

          // Create manual credits entry for assignment tracking
          const manualCreditsResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/manual_credits`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
              'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              user_id: userId,
              admin_id: req.user.id,
              amount: paymentAmount,
              classes_added: plan.monthly_classes,
              reason: 'promotional',
              description: `Subscription extended with ${plan.monthly_classes} classes from ${plan.name} plan by ${req.user.name} (${req.user.role}). Payment: $${paymentAmount}. ${notes}`.trim(),
              created_at: new Date().toISOString()
            })
          });

          if (!manualCreditsResponse.ok) {
            console.error('Manual credits record error:', await manualCreditsResponse.text());
          }

          // Log activity
          const activityResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/client_activity_log`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
              'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              client_id: userId,
              activity_type: 'subscription_renewal',
              description: `Subscription extended with ${plan.monthly_classes} classes from ${plan.name} plan by ${req.user.name} (${req.user.role}). Payment: $${paymentAmount}. ${notes}`.trim(),
              performed_by: req.user.id,
              created_at: new Date().toISOString()
            })
          });

          if (!activityResponse.ok) {
            console.error('Activity log error:', await activityResponse.text());
          }

          // Get updated subscription with plan details
          const subscriptionResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/user_subscriptions?id=eq.${existingSubscription.id}&select=*,subscription_plans!inner(name,equipment_access,monthly_price,monthly_classes,category),users!inner(name,email)`, {
            headers: {
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
              'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
              'Content-Type': 'application/json'
            }
          });

          if (subscriptionResponse.ok) {
            const subscriptions = await subscriptionResponse.json();
            if (subscriptions.length > 0) {
              const subData = subscriptions[0];
              resultSubscription = {
                ...subData,
                plan_name: subData.subscription_plans.name,
                equipment_access: subData.subscription_plans.equipment_access,
                monthly_price: subData.subscription_plans.monthly_price,
                monthly_classes: subData.subscription_plans.monthly_classes,
                category: subData.subscription_plans.category,
                user_name: subData.users.name,
                user_email: subData.users.email
              };
            }
          }

        } else {
          // SQLite fallback - this should not be reached when using Supabase
          console.warn('⚠️ Raw SQL not supported in Supabase. Use direct table operations instead.');
          throw new Error('Database configuration error. Please contact administrator.');
        }

        operationType = 'extended';
        console.log(`🎫 Reception extended ${user.name}'s subscription with ${plan.monthly_classes} classes from ${plan.name} plan. Payment: $${paymentAmount}`);

      } else {
        // CREATE NEW SUBSCRIPTION (replace existing if any)
        
        if (db.useSupabase) {
          // If user has an existing active subscription, cancel it first
          if (existingSubscription) {
            const cancelResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/user_subscriptions?id=eq.${existingSubscription.id}`, {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                status: 'cancelled',
                remaining_classes: 0,
                updated_at: new Date().toISOString()
              })
            });

            if (!cancelResponse.ok) {
              console.error('Cancel existing subscription error:', await cancelResponse.text());
            }
            console.log(`🎫 Reception cancelled existing subscription ${existingSubscription.id} for user ${userId}`);
            
            // Log the cancellation activity
            const cancelActivityResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/client_activity_log`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                client_id: userId,
                activity_type: 'subscription_cancellation',
                description: `Previous subscription cancelled by ${req.user.role} to assign new subscription. ${existingSubscription.remaining_classes > 0 ? `${existingSubscription.remaining_classes} remaining classes cleared.` : ''}`,
                performed_by: req.user.id,
                created_at: new Date().toISOString()
              })
            });

            if (!cancelActivityResponse.ok) {
              console.error('Cancel activity log error:', await cancelActivityResponse.text());
            }
          }

          // Calculate start and end dates - SIMPLE!
          const startDate = SimpleDateCalculator.toStorageFormat(new Date());
          const endDate = SimpleDateCalculator.calculateEndDate(new Date(), plan.duration, plan.duration_unit);

          // Create new subscription
          const subscriptionResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/user_subscriptions`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
              'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              user_id: userId,
              plan_id: planId,
              remaining_classes: plan.monthly_classes,
              start_date: startDate,
              end_date: endDate,
              status: 'active'
            })
          });

          if (!subscriptionResponse.ok) {
            const errorText = await subscriptionResponse.text();
            console.error('Subscription creation error:', errorText);
            throw new Error(`Failed to create subscription: ${subscriptionResponse.status} ${errorText}`);
          }

          let subscriptionData;
          try {
            subscriptionData = await subscriptionResponse.json();
          } catch (parseError) {
            console.error('JSON parsing error for subscription response:', parseError);
            throw new Error('Failed to parse subscription response');
          }

          if (!subscriptionData || subscriptionData.length === 0) {
            console.error('Subscription creation failed: No data returned');
            throw new Error('Failed to create subscription: No data returned');
          }
          console.log('✅ Subscription created successfully:', subscriptionData[0].id);

          // For new subscriptions, payment amount is the full plan price
          paymentAmount = plan.monthly_price;

          // Create payment record with placeholder UUID (due to schema mismatch)
          const generateUUID = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
          
          const paymentResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/payments`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
              'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              user_id: userId,
              subscription_id: generateUUID(), // Use placeholder UUID due to schema mismatch
              amount: paymentAmount,
              payment_date: startDate,
              payment_method: paymentMethod,
              status: 'completed'
            })
          });

          if (!paymentResponse.ok) {
            console.error('Payment record error:', await paymentResponse.text());
          }

          // Create manual credits entry for assignment tracking
          const manualCreditsResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/manual_credits`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
              'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              user_id: userId,
              admin_id: req.user.id,
              amount: paymentAmount,
              classes_added: plan.monthly_classes,
              reason: 'promotional',
              description: `New ${plan.name} subscription assigned by ${req.user.name} (${req.user.role}). Payment: $${paymentAmount}. ${notes}`.trim(),
              created_at: new Date().toISOString()
            })
          });

          if (!manualCreditsResponse.ok) {
            console.error('Manual credits record error:', await manualCreditsResponse.text());
          }

          // Log activity
          const activityResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/client_activity_log`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
              'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              client_id: userId,
              activity_type: 'subscription_purchase',
              description: `New ${plan.name} subscription assigned by ${req.user.name} (${req.user.role}). Payment: $${paymentAmount}. ${notes}`.trim(),
              performed_by: req.user.id,
              created_at: new Date().toISOString()
            })
          });

          if (!activityResponse.ok) {
            console.error('Activity log error:', await activityResponse.text());
          }

          // Get the created subscription with plan details
          const resultResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/user_subscriptions?id=eq.${subscriptionData[0].id}&select=*,subscription_plans!inner(name,equipment_access,monthly_price,monthly_classes,category),users!inner(name,email)`, {
            headers: {
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
              'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
              'Content-Type': 'application/json'
            }
          });

          if (resultResponse.ok) {
            const resultData = await resultResponse.json();
            if (resultData.length > 0) {
              resultSubscription = {
                ...resultData[0],
                plan_name: resultData[0].subscription_plans.name,
                equipment_access: resultData[0].subscription_plans.equipment_access,
                monthly_price: resultData[0].subscription_plans.monthly_price,
                monthly_classes: resultData[0].subscription_plans.monthly_classes,
                category: resultData[0].subscription_plans.category,
                user_name: resultData[0].users.name,
                user_email: resultData[0].users.email
              };
            }
          }

        } else {
          // SQLite fallback - this should not be reached when using Supabase
          console.warn('⚠️ Raw SQL not supported in Supabase. Use direct table operations instead.');
          throw new Error('Database configuration error. Please contact administrator.');
        }

        operationType = 'assigned';
        console.log(`🎫 Reception assigned ${plan.name} subscription to ${user.name} (${user.email}). Payment: $${paymentAmount}`);
      }

      // Create notification for the user
      try {
        await subscriptionNotificationService.createSubscriptionChangeNotification(
          userId,
          operationType === 'extended' ? 'extended' : operationType === 'assigned' ? 'assigned' : 'replaced',
          operationType === 'extended' ? 
            `Added ${plan.monthly_classes} classes from ${plan.name} plan. Payment: $${paymentAmount}` :
            `${plan.name} subscription. Payment: $${paymentAmount}`,
          req.user.id
        );
      } catch (notificationError) {
        console.error('Notification creation error:', notificationError);
        // Don't fail the subscription assignment if notification fails
      }

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

    } catch (subscriptionError) {
      console.error('Subscription assignment error:', subscriptionError);
      res.status(500).json({
        success: false,
        message: 'Failed to assign subscription'
      });
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

    if (db.useSupabase) {
      // Get subscription with plan details using Supabase
      const subscriptionResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/user_subscriptions?id=eq.${req.params.id}&select=*,subscription_plans!inner(monthly_price,monthly_classes,duration_months)`, {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        }
      });

      if (!subscriptionResponse.ok) {
        throw new Error('Failed to fetch subscription');
      }

      const subscriptions = await subscriptionResponse.json();
      if (subscriptions.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Subscription not found'
        });
      }

      const subscription = {
        ...subscriptions[0],
        monthly_price: subscriptions[0].subscription_plans.monthly_price,
        monthly_classes: subscriptions[0].subscription_plans.monthly_classes,
        duration_months: subscriptions[0].subscription_plans.duration_months
      };

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

      // Calculate new dates - SIMPLE!
      const startDate = SimpleDateCalculator.toStorageFormat(new Date());
      const endDate = SimpleDateCalculator.calculateEndDate(new Date(), subscription.duration || 1, subscription.duration_unit || 'months');

      // Update subscription using Supabase
      const updateResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/user_subscriptions?id=eq.${req.params.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          remaining_classes: subscription.monthly_classes,
          start_date: startDate,
          end_date: endDate,
          status: 'active',
          updated_at: new Date().toISOString()
        })
      });

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error('❌ Supabase error response (UPDATE subscription):', errorText);
        throw new Error('Failed to update subscription');
      }

      // Create payment record using Supabase
      const paymentResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/payments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: subscription.user_id,
          subscription_id: req.params.id,
          amount: subscription.monthly_price,
          payment_date: startDate,
          payment_method: paymentMethod,
          status: 'completed'
        })
      });

      if (!paymentResponse.ok) {
        console.error('❌ Payment record creation failed, but subscription was renewed');
      }

      res.json({
        success: true,
        message: 'Subscription renewed successfully'
      });

    } else {
      // SQLite fallback
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

      // Calculate new dates - SIMPLE!
      const startDate = SimpleDateCalculator.toStorageFormat(new Date());
      const endDate = SimpleDateCalculator.calculateEndDate(new Date(), subscription.duration || 1, subscription.duration_unit || 'months');

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
    
    if (db.useSupabase) {
      // Build Supabase query for user subscriptions with assignment details
      let queryUrl = `${process.env.SUPABASE_URL}/rest/v1/user_subscriptions?user_id=eq.${userId}&select=*,subscription_plans!inner(name,equipment_access,monthly_price,monthly_classes,category,features,duration_months)`;
      
      const queryParams = [];
      
      if (status) {
        queryParams.push(`status=eq.${status}`);
      }
      
      if (queryParams.length > 0) {
        queryUrl += '&' + queryParams.join('&');
      }
      
      queryUrl += '&order=created_at.desc';
      
      const subscriptionsResponse = await fetch(queryUrl, {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        }
      });

      if (!subscriptionsResponse.ok) {
        const errorText = await subscriptionsResponse.text();
        console.error('❌ Supabase error response (GET user subscriptions):', errorText);
        throw new Error('Failed to fetch user subscriptions');
      }

      const subscriptions = await subscriptionsResponse.json();
      console.log(`📊 Found ${subscriptions.length} subscriptions for user ${userId}`);

      // Process and format the response
      const today = new Date().toISOString().split('T')[0];
      const formattedSubscriptions = (subscriptions || []).map(subscription => {
        // Check if subscription should be expired
        const isExpired = subscription.end_date < today && subscription.status === 'active';
        
        return {
          ...subscription,
          plan_name: subscription.subscription_plans.name,
          equipment_access: subscription.subscription_plans.equipment_access,
          monthly_price: subscription.subscription_plans.monthly_price,
          monthly_classes: subscription.subscription_plans.monthly_classes,
          category: subscription.subscription_plans.category,
          features: subscription.subscription_plans.features ? JSON.parse(subscription.subscription_plans.features) : [],
          duration_months: subscription.subscription_plans.duration_months,
          status: isExpired ? 'expired' : subscription.status,
          actual_status: isExpired ? 'expired' : subscription.status,
          // Assignment info will be added separately if needed
          assigned_by: null
        };
      });

      res.json({
        success: true,
        data: formattedSubscriptions
      });

    } else {
      // SQLite fallback
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
    }

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
    
    // Get total subscription count using Supabase REST API
    const totalSubscriptionsResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/user_subscriptions?user_id=eq.${userId}&select=id`, {
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    if (!totalSubscriptionsResponse.ok) {
      throw new Error('Failed to fetch total subscriptions');
    }
    
    const totalSubscriptionsData = await totalSubscriptionsResponse.json();
    const totalSubscriptions = { count: totalSubscriptionsData.length };

    // Get current active subscription using Supabase REST API
    const currentSubscriptionResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/user_subscriptions?user_id=eq.${userId}&status=eq.active&select=*,subscription_plans(name,monthly_price,equipment_access)&order=created_at.desc&limit=1`, {
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    let currentSubscription = null;
    if (currentSubscriptionResponse.ok) {
      const currentSubscriptionData = await currentSubscriptionResponse.json();
      if (currentSubscriptionData.length > 0) {
        const subscription = currentSubscriptionData[0];
        currentSubscription = {
          ...subscription,
          plan_name: subscription.subscription_plans?.name,
          monthly_price: subscription.subscription_plans?.monthly_price,
          equipment_access: subscription.subscription_plans?.equipment_access
        };
      }
    }

    // Get subscription history summary using Supabase REST API
    const subscriptionSummaryResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/user_subscriptions?user_id=eq.${userId}&select=subscription_plans(name,monthly_price)`, {
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    let subscriptionSummary = [];
    if (subscriptionSummaryResponse.ok) {
      const subscriptionSummaryData = await subscriptionSummaryResponse.json();
      
      // Process the data to group by plan
      const planCounts = {};
      subscriptionSummaryData.forEach(subscription => {
        if (subscription.subscription_plans) {
          const planName = subscription.subscription_plans.name;
          const monthlyPrice = subscription.subscription_plans.monthly_price || 0;
          
          if (!planCounts[planName]) {
            planCounts[planName] = {
              plan_name: planName,
              purchase_count: 0,
              total_spent: 0
            };
          }
          
          planCounts[planName].purchase_count++;
          planCounts[planName].total_spent += monthlyPrice;
        }
      });
      
      subscriptionSummary = Object.values(planCounts).sort((a, b) => b.purchase_count - a.purchase_count);
    }

    // Get total money spent on subscriptions (from payments) using Supabase REST API
    const totalSpentResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/payments?status=eq.completed&select=amount,user_subscriptions(user_id)`, {
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    let totalSpent = { total_amount: 0 };
    if (totalSpentResponse.ok) {
      const totalSpentData = await totalSpentResponse.json();
      
      // Filter payments for this user and sum amounts
      const userPayments = totalSpentData.filter(payment => 
        payment.user_subscriptions && payment.user_subscriptions.user_id === userId
      );
      
      const totalAmount = userPayments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
      totalSpent = { total_amount: totalAmount };
    }

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

// GET /api/subscriptions/assignments/stats - Get assignment statistics (admin/reception only)
router.get('/assignments/stats', authenticateToken, requireAdminOrReception, async (req, res) => {
  try {
    const { adminId, dateFrom, dateTo } = req.query;
    
    // Build Supabase query parameters for total assignments
    let queryParams = new URLSearchParams();
    queryParams.append('reason', 'eq.promotional');
    queryParams.append('description', 'like.*subscription assigned*');
    queryParams.append('select', 'id');
    
    if (adminId) {
      queryParams.append('admin_id', `eq.${adminId}`);
    }
    
    if (dateFrom) {
      queryParams.append('created_at', `gte.${dateFrom}`);
    }
    
    if (dateTo) {
      queryParams.append('created_at', `lte.${dateTo}`);
    }
    
    // Get total assignments using Supabase REST API
    const totalAssignmentsResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/manual_credits?${queryParams.toString()}`, {
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    let totalAssignments = { count: 0 };
    if (totalAssignmentsResponse.ok) {
      const totalAssignmentsData = await totalAssignmentsResponse.json();
      totalAssignments = { count: totalAssignmentsData.length };
    }
    
    // Get assignments by admin using Supabase REST API
    const assignmentsByAdminResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/manual_credits?reason=eq.promotional&description=like.*subscription assigned*&select=admin_id,classes_added,users!manual_credits_admin_id_fkey(name,role)`, {
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    let assignmentsByAdmin = [];
    if (assignmentsByAdminResponse.ok) {
      const assignmentsByAdminData = await assignmentsByAdminResponse.json();
      
      // Process the data to group by admin
      const adminCounts = {};
      assignmentsByAdminData.forEach(assignment => {
        const adminName = assignment.users?.name || 'Unknown';
        const adminRole = assignment.users?.role || 'Unknown';
        const key = `${adminName}-${adminRole}`;
        
        if (!adminCounts[key]) {
          adminCounts[key] = {
            admin_name: adminName,
            admin_role: adminRole,
            assignment_count: 0,
            total_classes_assigned: 0
          };
        }
        
        adminCounts[key].assignment_count++;
        adminCounts[key].total_classes_assigned += (assignment.classes_added || 0);
      });
      
      assignmentsByAdmin = Object.values(adminCounts).sort((a, b) => b.assignment_count - a.assignment_count);
    }
    
    // Get assignments by month using Supabase REST API
    const assignmentsByMonthResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/manual_credits?reason=eq.promotional&description=like.*subscription assigned*&select=created_at,classes_added&order=created_at.desc`, {
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    let assignmentsByMonth = [];
    if (assignmentsByMonthResponse.ok) {
      const assignmentsByMonthData = await assignmentsByMonthResponse.json();
      
      // Process the data to group by month
      const monthCounts = {};
      assignmentsByMonthData.forEach(assignment => {
        const date = new Date(assignment.created_at);
        const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthCounts[month]) {
          monthCounts[month] = {
            month,
            assignment_count: 0,
            classes_assigned: 0
          };
        }
        
        monthCounts[month].assignment_count++;
        monthCounts[month].classes_assigned += (assignment.classes_added || 0);
      });
      
      assignmentsByMonth = Object.values(monthCounts)
        .sort((a, b) => b.month.localeCompare(a.month))
        .slice(0, 12);
    }

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
  body('planId').notEmpty().withMessage('Valid plan ID is required for pricing'),
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
    
    if (db.useSupabase) {
      // Get the subscription using Supabase REST API
      const subscriptionResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/user_subscriptions?id=eq.${subscriptionId}&select=*,subscription_plans!inner(name,monthly_price,monthly_classes),users!inner(name,email)`, {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        }
      });

      if (!subscriptionResponse.ok) {
        throw new Error('Failed to fetch subscription');
      }

      const subscriptions = await subscriptionResponse.json();
      if (subscriptions.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Subscription not found'
        });
      }

      const subscription = {
        ...subscriptions[0],
        plan_name: subscriptions[0].subscription_plans.name,
        monthly_price: subscriptions[0].subscription_plans.monthly_price,
        monthly_classes: subscriptions[0].subscription_plans.monthly_classes,
        user_name: subscriptions[0].users.name,
        user_email: subscriptions[0].users.email
      };

      if (subscription.status !== 'active') {
        return res.status(400).json({
          success: false,
          message: 'Can only add classes to active subscriptions'
        });
      }

      // Get the plan being used for pricing using Supabase REST API
      const pricingPlanResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/subscription_plans?id=eq.${planId}&is_active=eq.true&select=*`, {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        }
      });

      if (!pricingPlanResponse.ok) {
        throw new Error('Failed to fetch pricing plan');
      }

      const pricingPlans = await pricingPlanResponse.json();
      if (pricingPlans.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Pricing plan not found or inactive'
        });
      }

      const pricingPlan = pricingPlans[0];

      // Calculate price per class from the plan
      const pricePerClass = pricingPlan.monthly_price / pricingPlan.monthly_classes;
      const totalAmount = paymentAmount || (pricePerClass * classesToAdd);

      // Update subscription with additional classes using Supabase REST API
      const newRemainingClasses = subscription.remaining_classes + classesToAdd;
      
      const updateResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/user_subscriptions?id=eq.${subscriptionId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          remaining_classes: newRemainingClasses,
          updated_at: new Date().toISOString()
        })
      });

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error('❌ Supabase error response (UPDATE subscription):', errorText);
        throw new Error('Failed to update subscription');
      }

      // Record the class addition in manual_credits table using Supabase REST API
      const manualCreditsResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/manual_credits`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: subscription.user_id,
          admin_id: req.user.id,
          amount: totalAmount,
          classes_added: classesToAdd,
          reason: 'adjustment',
          description: `${classesToAdd} classes added from ${pricingPlan.name} plan by ${req.user.role} ${req.user.name}. ${reason}`.trim(),
          created_at: new Date().toISOString()
        })
      });

      if (!manualCreditsResponse.ok) {
        console.error('⚠️ Failed to record manual credits');
      }

      // Create payment record if there's a charge using Supabase REST API
      if (totalAmount > 0) {
        const paymentResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/payments`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            user_id: subscription.user_id,
            subscription_id: subscriptionId,
            amount: totalAmount,
            payment_date: moment().format('YYYY-MM-DD'),
            payment_method: 'manual',
            status: 'completed'
          })
        });

        if (!paymentResponse.ok) {
          console.error('⚠️ Failed to create payment record');
        }
      }

      // Log the activity using Supabase REST API
      const activityResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/client_activity_log`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: subscription.user_id,
          activity_type: 'subscription_extended',
          description: `${classesToAdd} classes added to subscription by ${req.user.name} (${req.user.role}). Total classes now: ${newRemainingClasses}`,
          performed_by: req.user.id,
          created_at: new Date().toISOString()
        })
      });

      if (!activityResponse.ok) {
        console.error('⚠️ Failed to log activity');
      }

      console.log(`💰 Reception added ${classesToAdd} classes to ${subscription.user_name}'s subscription (ID: ${subscriptionId}) for $${totalAmount.toFixed(2)}`);

      // Get updated subscription using Supabase REST API
      const updatedSubscriptionResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/user_subscriptions?id=eq.${subscriptionId}&select=*,subscription_plans!inner(name,equipment_access,monthly_price,monthly_classes,category)`, {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        }
      });

      let updatedSubscription = null;
      if (updatedSubscriptionResponse.ok) {
        const updatedSubscriptions = await updatedSubscriptionResponse.json();
        if (updatedSubscriptions.length > 0) {
          updatedSubscription = {
            ...updatedSubscriptions[0],
            plan_name: updatedSubscriptions[0].subscription_plans.name,
            equipment_access: updatedSubscriptions[0].subscription_plans.equipment_access,
            monthly_price: updatedSubscriptions[0].subscription_plans.monthly_price,
            monthly_classes: updatedSubscriptions[0].subscription_plans.monthly_classes,
            category: updatedSubscriptions[0].subscription_plans.category
          };
        }
      }

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

    } else {
      // SQLite implementation
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
    
    if (db.useSupabase) {
      // Get the subscription using Supabase REST API
      const subscriptionResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/user_subscriptions?id=eq.${subscriptionId}&select=*,subscription_plans!inner(name,monthly_price,monthly_classes),users!inner(name,email)`, {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        }
      });

      if (!subscriptionResponse.ok) {
        throw new Error('Failed to fetch subscription');
      }

      const subscriptions = await subscriptionResponse.json();
      if (subscriptions.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Subscription not found'
        });
      }

      const subscription = {
        ...subscriptions[0],
        plan_name: subscriptions[0].subscription_plans.name,
        monthly_price: subscriptions[0].subscription_plans.monthly_price,
        monthly_classes: subscriptions[0].subscription_plans.monthly_classes,
        user_name: subscriptions[0].users.name,
        user_email: subscriptions[0].users.email
      };

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

      // Update subscription with removed classes using Supabase REST API
      const newRemainingClasses = subscription.remaining_classes - classesToRemove;
      
      const updateResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/user_subscriptions?id=eq.${subscriptionId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          remaining_classes: newRemainingClasses,
          updated_at: new Date().toISOString()
        })
      });

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error('❌ Supabase error response (UPDATE subscription):', errorText);
        throw new Error('Failed to update subscription');
      }

      // Record the class removal in manual_credits table using Supabase REST API (as negative classes)
      const manualCreditsResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/manual_credits`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: subscription.user_id,
          admin_id: req.user.id,
          amount: -totalAmount,
          classes_added: -classesToRemove,
          reason: 'adjustment',
          description: `${classesToRemove} classes removed from ${subscription.plan_name} plan by ${req.user.role} ${req.user.name}. ${reason}`.trim(),
          created_at: new Date().toISOString()
        })
      });

      if (!manualCreditsResponse.ok) {
        console.error('⚠️ Failed to record manual credits');
      }

      // Create a credit record for the refund amount using Supabase REST API
      if (totalAmount > 0) {
        const paymentResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/payments`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            user_id: subscription.user_id,
            subscription_id: subscriptionId,
            amount: -totalAmount,
            payment_date: moment().format('YYYY-MM-DD'),
            payment_method: 'manual',
            status: 'completed'
          })
        });

        if (!paymentResponse.ok) {
          console.error('⚠️ Failed to create payment record');
        }
      }

      // Log the activity using Supabase REST API
      const activityResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/client_activity_log`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client_id: subscription.user_id,
          activity_type: 'subscription_extended',
          description: `${classesToRemove} classes removed from subscription by ${req.user.name} (${req.user.role}). Total classes now: ${newRemainingClasses}`,
          performed_by: req.user.id,
          created_at: new Date().toISOString()
        })
      });

      if (!activityResponse.ok) {
        console.error('⚠️ Failed to log activity');
      }

      console.log(`🔄 Reception removed ${classesToRemove} classes from ${subscription.user_name}'s subscription (ID: ${subscriptionId}) for $${totalAmount.toFixed(2)} refund`);

      // Get updated subscription using Supabase REST API
      const updatedSubscriptionResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/user_subscriptions?id=eq.${subscriptionId}&select=*,subscription_plans!inner(name,equipment_access,monthly_price,monthly_classes,category)`, {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        }
      });

      let updatedSubscription = null;
      if (updatedSubscriptionResponse.ok) {
        const updatedSubscriptions = await updatedSubscriptionResponse.json();
        if (updatedSubscriptions.length > 0) {
          updatedSubscription = {
            ...updatedSubscriptions[0],
            plan_name: updatedSubscriptions[0].subscription_plans.name,
            equipment_access: updatedSubscriptions[0].subscription_plans.equipment_access,
            monthly_price: updatedSubscriptions[0].subscription_plans.monthly_price,
            monthly_classes: updatedSubscriptions[0].subscription_plans.monthly_classes,
            category: updatedSubscriptions[0].subscription_plans.category
          };
        }
      }

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

    } else {
      // SQLite implementation
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