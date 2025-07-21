const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, requireAdmin, requireAdminOrReception } = require('../middleware/auth');

const router = express.Router();

// GET /api/client-activity/:clientId - Get activity timeline for a client
router.get('/:clientId', authenticateToken, requireAdminOrReception, async (req, res) => {
  try {
    console.log('🔍 CLIENT ACTIVITY DEBUG: Route hit for clientId:', req.params.clientId);
    console.log('🔍 CLIENT ACTIVITY DEBUG: User:', req.user ? `${req.user.name} (${req.user.role})` : 'No user');
    console.log('🔍 CLIENT ACTIVITY DEBUG: Using Supabase:', db.useSupabase);
    
    const { clientId } = req.params;
    const { 
      type, 
      startDate, 
      endDate, 
      limit = 100, 
      offset = 0,
      includeAutomatic = true 
    } = req.query;
    
    console.log('🔍 CLIENT ACTIVITY DEBUG: Query params:', { type, startDate, endDate, limit, offset, includeAutomatic });
    
    if (db.useSupabase) {
      // Use Supabase REST API - get activities first, then get user names separately
      let queryUrl = `${process.env.SUPABASE_URL}/rest/v1/client_activity_log?client_id=eq.${clientId}&select=*`;
      
      const queryParams = [];
      
      if (type) {
        queryParams.push(`activity_type=eq.${type}`);
      }

      if (startDate) {
        queryParams.push(`created_at=gte.${startDate}`);
      }

      if (endDate) {
        queryParams.push(`created_at=lte.${endDate}`);
      }

      if (includeAutomatic === 'false') {
        queryParams.push(`performed_by=not.is.null`);
      }
      
      if (queryParams.length > 0) {
        queryUrl += '&' + queryParams.join('&');
      }
      
      queryUrl += `&order=created_at.desc&limit=${limit}&offset=${offset}`;
      
      console.log('🔍 Fetching client activities with URL:', queryUrl);
      
      const response = await fetch(queryUrl, {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const activities = await response.json();
        console.log(`✅ Found ${activities.length} activities for client ${clientId}`);
        
        // Get unique performer IDs to fetch user names
        const performerIds = [...new Set(activities.filter(a => a.performed_by).map(a => a.performed_by))];
        
        let performerNames = {};
        if (performerIds.length > 0) {
          try {
            const usersResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/users?id=in.(${performerIds.join(',')})&select=id,name`, {
              headers: {
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
                'Content-Type': 'application/json'
              }
            });
            
            if (usersResponse.ok) {
              const users = await usersResponse.json();
              performerNames = users.reduce((acc, user) => {
                acc[user.id] = user.name;
                return acc;
              }, {});
            }
          } catch (userError) {
            console.error('⚠️ Error fetching performer names:', userError);
          }
        }
        
        // Format the response to match the expected structure
        const formattedActivities = (activities || []).map(activity => ({
          ...activity,
          performed_by_name: activity.performed_by ? performerNames[activity.performed_by] || null : null,
          metadata: activity.metadata || null
        }));
        
        res.json({
          success: true,
          data: formattedActivities
        });
      } else {
        const errorText = await response.text();
        console.error('❌ Supabase error response (GET client activities):', errorText);
        res.status(500).json({
          success: false,
          message: 'Failed to fetch client activities'
        });
      }
    } else {
      // SQLite implementation
      let query = `
        SELECT 
          cal.*,
          u.name as performed_by_name
        FROM client_activity_log cal
        LEFT JOIN users u ON cal.performed_by = u.id
        WHERE cal.client_id = ?
      `;
      
      const params = [clientId];

      if (type) {
        query += ' AND cal.activity_type = ?';
        params.push(type);
      }

      if (startDate) {
        query += ' AND cal.created_at >= ?';
        params.push(startDate);
      }

      if (endDate) {
        query += ' AND cal.created_at <= ?';
        params.push(endDate);
      }

      if (includeAutomatic === 'false') {
        query += ' AND cal.performed_by IS NOT NULL';
      }

      query += ' ORDER BY cal.created_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));

      const activities = await db.all(query, params);

      // Format metadata (SQLite stores as JSON string, parse it)
      const formattedActivities = activities.map(activity => ({
        ...activity,
        metadata: activity.metadata ? JSON.parse(activity.metadata) : null
      }));

      res.json({
        success: true,
        data: formattedActivities
      });
    }

  } catch (error) {
    console.error('❌ CLIENT ACTIVITY ERROR - Full error details:', error);
    console.error('❌ CLIENT ACTIVITY ERROR - Error message:', error.message);
    console.error('❌ CLIENT ACTIVITY ERROR - Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/client-activity - Log a new activity (manual entry)
router.post('/', authenticateToken, requireAdminOrReception, [
  body('clientId').notEmpty().withMessage('Valid client ID is required'),
  body('activityType').isIn([
    'registration', 'login', 'subscription_purchase', 'subscription_renewal', 'subscription_cancellation',
    'class_booking', 'class_cancellation', 'class_attendance', 'class_no_show',
    'payment_made', 'payment_failed', 'profile_update', 'note_added', 'document_uploaded',
    'status_change', 'communication_sent', 'waitlist_joined', 'waitlist_promoted'
  ]).withMessage('Valid activity type is required'),
  body('description').trim().isLength({ min: 1 }).withMessage('Description is required'),
  body('metadata').optional().isObject()
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

    const { 
      clientId, 
      activityType, 
      description, 
      metadata = null,
      ipAddress,
      userAgent
    } = req.body;

    if (db.useSupabase) {
      // Verify client exists using Supabase
      const clientResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/users?id=eq.${clientId}&role=eq.client&select=id,name`, {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        }
      });

      if (!clientResponse.ok) {
        throw new Error('Failed to verify client');
      }

      const clientData = await clientResponse.json();
      if (clientData.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Client not found'
        });
      }

      // Create the activity log entry using Supabase
      const activityData = {
        client_id: clientId,
        activity_type: activityType,
        description: description,
        metadata: metadata ? JSON.stringify(metadata) : null,
        performed_by: req.user.id,
        ip_address: ipAddress || null,
        user_agent: userAgent || null,
        created_at: new Date().toISOString()
      };

      const activityResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/client_activity_log`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(activityData)
      });

      if (!activityResponse.ok) {
        const errorText = await activityResponse.text();
        console.error('❌ Supabase error response (POST client_activity_log):', errorText);
        throw new Error('Failed to create activity log: ' + errorText);
      }

      const newActivityData = await activityResponse.json();
      const newActivity = newActivityData[0];

      // Get performer name
      if (newActivity.performed_by) {
        const performerResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/users?id=eq.${newActivity.performed_by}&select=name`, {
          headers: {
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json'
          }
        });

        if (performerResponse.ok) {
          const performerData = await performerResponse.json();
          newActivity.performed_by_name = performerData[0]?.name;
        }
      }

      // Format metadata (Supabase already returns as object)
      newActivity.metadata = newActivity.metadata || null;

      res.status(201).json({
        success: true,
        message: 'Activity logged successfully',
        data: newActivity
      });

    } else {
      // SQLite implementation
      // Verify client exists
      const client = await db.get('SELECT id, name FROM users WHERE id = ? AND role = "client"', [clientId]);
      if (!client) {
        return res.status(404).json({
          success: false,
          message: 'Client not found'
        });
      }

      // Create the activity log entry
      const result = await db.run(`
        INSERT INTO client_activity_log (
          client_id, activity_type, description, metadata, performed_by, ip_address, user_agent
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        clientId,
        activityType,
        description,
        metadata ? JSON.stringify(metadata) : null,
        req.user.id,
        ipAddress || null,
        userAgent || null
      ]);

      // Get the created activity with performer name
      const newActivity = await db.get(`
        SELECT 
          cal.*,
          u.name as performed_by_name
        FROM client_activity_log cal
        LEFT JOIN users u ON cal.performed_by = u.id
        WHERE cal.id = ?
      `, [result.id]);

      // Format metadata (SQLite stores as JSON string, parse it)
      newActivity.metadata = newActivity.metadata ? JSON.parse(newActivity.metadata) : null;

      res.status(201).json({
        success: true,
        message: 'Activity logged successfully',
        data: newActivity
      });
    }

  } catch (error) {
    console.error('Log client activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/client-activity/stats/:clientId - Get activity statistics for a client
router.get('/stats/:clientId', authenticateToken, requireAdminOrReception, async (req, res) => {
  try {
    const { clientId } = req.params;

    if (db.useSupabase) {
      // Get all activities for this client
      const activitiesResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/client_activity_log?client_id=eq.${clientId}&select=activity_type,created_at`, {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        }
      });

      if (!activitiesResponse.ok) {
        throw new Error('Failed to fetch activities');
      }

      const activities = await activitiesResponse.json();
      
      // Process data on the backend side
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Calculate statistics
      const typeStats = {};
      const dailyStats = {};
      let totalActivities = 0;
      let recentActivities = 0;
      let firstActivity = null;
      let lastActivity = null;

      activities.forEach(activity => {
        const activityDate = new Date(activity.created_at);
        totalActivities++;

        // Type stats
        typeStats[activity.activity_type] = (typeStats[activity.activity_type] || 0) + 1;

        // Recent activities (last 7 days)
        if (activityDate >= sevenDaysAgo) {
          recentActivities++;
        }

        // Daily stats (last 30 days)
        if (activityDate >= thirtyDaysAgo) {
          const dateKey = activityDate.toISOString().split('T')[0];
          dailyStats[dateKey] = (dailyStats[dateKey] || 0) + 1;
        }

        // First and last activity
        if (!firstActivity || activityDate < new Date(firstActivity)) {
          firstActivity = activity.created_at;
        }
        if (!lastActivity || activityDate > new Date(lastActivity)) {
          lastActivity = activity.created_at;
        }
      });

      // Convert to arrays and sort
      const typeStatsArray = Object.entries(typeStats)
        .map(([activity_type, count]) => ({ activity_type, count }))
        .sort((a, b) => b.count - a.count);

      const dailyStatsArray = Object.entries(dailyStats)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => b.date.localeCompare(a.date));

      const topActivities = typeStatsArray.slice(0, 5);

      res.json({
        success: true,
        data: {
          totalActivities,
          recentActivities,
          firstActivity,
          lastActivity,
          topActivities,
          dailyStats: dailyStatsArray,
          byType: typeStats
        }
      });

    } else {
      // SQLite implementation
      // Get activity counts by type
      const typeStats = await db.all(`
        SELECT activity_type, COUNT(*) as count
        FROM client_activity_log
        WHERE client_id = ?
        GROUP BY activity_type
        ORDER BY count DESC
      `, [clientId]);

      // Get activity counts by day for the last 30 days
      const dailyStats = await db.all(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as count
        FROM client_activity_log
        WHERE client_id = ? AND created_at >= date('now', '-30 days')
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `, [clientId]);

      // Get total activity count
      const totalActivities = await db.get(`
        SELECT COUNT(*) as count
        FROM client_activity_log
        WHERE client_id = ?
      `, [clientId]);

      // Get recent activity count (last 7 days)
      const recentActivities = await db.get(`
        SELECT COUNT(*) as count
        FROM client_activity_log
        WHERE client_id = ? AND created_at >= date('now', '-7 days')
      `, [clientId]);

      // Get most common activity types
      const topActivities = typeStats.slice(0, 5);

      // Get first and last activity dates
      const activityRange = await db.get(`
        SELECT 
          MIN(created_at) as first_activity,
          MAX(created_at) as last_activity
        FROM client_activity_log
        WHERE client_id = ?
      `, [clientId]);

      res.json({
        success: true,
        data: {
          totalActivities: totalActivities.count,
          recentActivities: recentActivities.count,
          firstActivity: activityRange?.first_activity,
          lastActivity: activityRange?.last_activity,
          topActivities,
          dailyStats,
          byType: typeStats.reduce((acc, item) => {
            acc[item.activity_type] = item.count;
            return acc;
          }, {})
        }
      });
    }

  } catch (error) {
    console.error('Get activity stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/client-activity/recent - Get recent activities across all clients (admin overview)
router.get('/recent', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { limit = 50, type } = req.query;
    
    if (db.useSupabase) {
      // Build Supabase query
      let queryUrl = `${process.env.SUPABASE_URL}/rest/v1/client_activity_log?select=*,client:users!client_activity_log_client_id_fkey(name),performed_by:users!client_activity_log_performed_by_fkey(name)`;
      
      const queryParams = [];
      
      if (type) {
        queryParams.push(`activity_type=eq.${type}`);
      }
      
      if (queryParams.length > 0) {
        queryUrl += '&' + queryParams.join('&');
      }
      
      queryUrl += `&order=created_at.desc&limit=${parseInt(limit)}`;
      
      const response = await fetch(queryUrl, {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Supabase error response (GET recent activities):', errorText);
        throw new Error('Failed to fetch recent activities');
      }
      
      const activities = await response.json();
      
      // Format the response
      const formattedActivities = (activities || []).map(activity => ({
        ...activity,
        client_name: activity.client?.name,
        performed_by_name: activity.performed_by?.name,
        metadata: activity.metadata || null
      }));

      res.json({
        success: true,
        data: formattedActivities
      });

    } else {
      // SQLite implementation
      let query = `
        SELECT 
          cal.*,
          u_client.name as client_name,
          u_performer.name as performed_by_name
        FROM client_activity_log cal
        JOIN users u_client ON cal.client_id = u_client.id
        LEFT JOIN users u_performer ON cal.performed_by = u_performer.id
        WHERE 1=1
      `;
      
      const params = [];

      if (type) {
        query += ' AND cal.activity_type = ?';
        params.push(type);
      }

      query += ' ORDER BY cal.created_at DESC LIMIT ?';
      params.push(parseInt(limit));

      const activities = await db.all(query, params);

      // Format metadata (SQLite stores as JSON string, parse it)
      const formattedActivities = activities.map(activity => ({
        ...activity,
        metadata: activity.metadata ? JSON.parse(activity.metadata) : null
      }));

      res.json({
        success: true,
        data: formattedActivities
      });
    }

  } catch (error) {
    console.error('Get recent activities error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// DELETE /api/client-activity/:activityId - Delete an activity log entry (admin only)
router.delete('/:activityId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { activityId } = req.params;

    if (db.useSupabase) {
      // Check if activity exists
      const activityResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/client_activity_log?id=eq.${activityId}&select=id`, {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        }
      });

      if (!activityResponse.ok) {
        throw new Error('Failed to check activity');
      }

      const activities = await activityResponse.json();
      if (activities.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Activity not found'
        });
      }

      // Delete the activity
      const deleteResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/client_activity_log?id=eq.${activityId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        }
      });

      if (!deleteResponse.ok) {
        const errorText = await deleteResponse.text();
        console.error('❌ Supabase error response (DELETE activity):', errorText);
        throw new Error('Failed to delete activity');
      }

      res.json({
        success: true,
        message: 'Activity deleted successfully'
      });

    } else {
      // SQLite implementation
      // Check if activity exists
      const activity = await db.get('SELECT * FROM client_activity_log WHERE id = ?', [activityId]);
      if (!activity) {
        return res.status(404).json({
          success: false,
          message: 'Activity not found'
        });
      }

      // Delete the activity
      await db.run('DELETE FROM client_activity_log WHERE id = ?', [activityId]);

      res.json({
        success: true,
        message: 'Activity deleted successfully'
      });
    }

  } catch (error) {
    console.error('Delete activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Utility function to log activity (can be used by other parts of the application)
const logActivity = async (clientId, activityType, description, metadata = null, performedBy = null, ipAddress = null, userAgent = null) => {
  try {
    if (db.useSupabase) {
      const activityData = {
        client_id: clientId,
        activity_type: activityType,
        description: description,
        metadata: metadata ? JSON.stringify(metadata) : null,
        performed_by: performedBy,
        ip_address: ipAddress,
        user_agent: userAgent,
        created_at: new Date().toISOString()
      };

      await fetch(`${process.env.SUPABASE_URL}/rest/v1/client_activity_log`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(activityData)
      });
    } else {
      await db.run(`
        INSERT INTO client_activity_log (
          client_id, activity_type, description, metadata, performed_by, ip_address, user_agent
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        clientId,
        activityType,
        description,
        metadata ? JSON.stringify(metadata) : null,
        performedBy,
        ipAddress,
        userAgent
      ]);
    }
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};

module.exports = router; 