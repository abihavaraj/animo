const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, requireAdmin, requireAdminOrReception } = require('../middleware/auth');

const router = express.Router();

// GET /api/client-activity/:clientId - Get activity timeline for a client
router.get('/:clientId', authenticateToken, requireAdminOrReception, async (req, res) => {
  try {
    const { clientId } = req.params;
    const { 
      type, 
      startDate, 
      endDate, 
      limit = 100, 
      offset = 0,
      includeAutomatic = true 
    } = req.query;
    
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

    // Parse metadata JSON
    const formattedActivities = activities.map(activity => ({
      ...activity,
      metadata: activity.metadata ? JSON.parse(activity.metadata) : null
    }));

    res.json({
      success: true,
      data: formattedActivities
    });

  } catch (error) {
    console.error('Get client activities error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/client-activity - Log a new activity (manual entry)
router.post('/', authenticateToken, requireAdminOrReception, [
  body('clientId').isInt({ min: 1 }).withMessage('Valid client ID is required'),
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

    // Parse metadata
    newActivity.metadata = newActivity.metadata ? JSON.parse(newActivity.metadata) : null;

    res.status(201).json({
      success: true,
      message: 'Activity logged successfully',
      data: newActivity
    });

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

    // Parse metadata JSON
    const formattedActivities = activities.map(activity => ({
      ...activity,
      metadata: activity.metadata ? JSON.parse(activity.metadata) : null
    }));

    res.json({
      success: true,
      data: formattedActivities
    });

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
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};

module.exports = router; 