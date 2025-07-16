const express = require('express');
const { body, validationResult } = require('express-validator');
const moment = require('moment');
const db = require('../config/database');
const { authenticateToken, requireAdmin, requireAdminOrReception } = require('../middleware/auth');

const router = express.Router();

// GET /api/client-lifecycle/:clientId - Get lifecycle information for a client
router.get('/:clientId', authenticateToken, requireAdminOrReception, async (req, res) => {
  try {
    const { clientId } = req.params;

    const lifecycle = await db.get(`
      SELECT 
        cl.*,
        u.name as stage_changed_by_name
      FROM client_lifecycle cl
      LEFT JOIN users u ON cl.stage_changed_by = u.id
      WHERE cl.client_id = ?
    `, [clientId]);

    if (!lifecycle) {
      // Create default lifecycle entry if none exists
      const result = await db.run(`
        INSERT INTO client_lifecycle (client_id, current_stage)
        VALUES (?, 'prospect')
      `, [clientId]);

      const newLifecycle = await db.get(`
        SELECT * FROM client_lifecycle WHERE id = ?
      `, [result.id]);

      return res.json({
        success: true,
        data: newLifecycle
      });
    }

    res.json({
      success: true,
      data: lifecycle
    });

  } catch (error) {
    console.error('Get client lifecycle error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// PUT /api/client-lifecycle/:clientId/stage - Update client lifecycle stage
router.put('/:clientId/stage', authenticateToken, requireAdminOrReception, [
  body('newStage').isIn([
    'prospect', 'trial', 'new_member', 'active', 'at_risk', 'inactive', 'churned', 'won_back'
  ]).withMessage('Valid stage is required'),
  body('notes').optional().trim()
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

    const { clientId } = req.params;
    const { newStage, notes } = req.body;

    // Verify client exists
    const client = await db.get('SELECT id, name FROM users WHERE id = ? AND role = "client"', [clientId]);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Get existing lifecycle or create new one
    let lifecycle = await db.get('SELECT * FROM client_lifecycle WHERE client_id = ?', [clientId]);
    
    if (!lifecycle) {
      // Create new lifecycle entry
      await db.run(`
        INSERT INTO client_lifecycle (
          client_id, current_stage, stage_changed_by, notes
        ) VALUES (?, ?, ?, ?)
      `, [clientId, newStage, req.user.id, notes || null]);
    } else {
      // Update existing lifecycle
      await db.run(`
        UPDATE client_lifecycle SET
          previous_stage = current_stage,
          current_stage = ?,
          stage_changed_at = CURRENT_TIMESTAMP,
          stage_changed_by = ?,
          days_in_current_stage = 0,
          notes = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE client_id = ?
      `, [newStage, req.user.id, notes || lifecycle.notes, clientId]);
    }

    // Log the stage change activity
    await db.run(`
      INSERT INTO client_activity_log (
        client_id, activity_type, description, performed_by
      ) VALUES (?, ?, ?, ?)
    `, [
      clientId,
      'status_change',
      `Lifecycle stage changed ${lifecycle ? `from "${lifecycle.current_stage}" ` : ''}to "${newStage}"${notes ? ` - ${notes}` : ''}`,
      req.user.id
    ]);

    // Get updated lifecycle
    const updatedLifecycle = await db.get(`
      SELECT 
        cl.*,
        u.name as stage_changed_by_name
      FROM client_lifecycle cl
      LEFT JOIN users u ON cl.stage_changed_by = u.id
      WHERE cl.client_id = ?
    `, [clientId]);

    res.json({
      success: true,
      message: 'Lifecycle stage updated successfully',
      data: updatedLifecycle
    });

  } catch (error) {
    console.error('Update lifecycle stage error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// PUT /api/client-lifecycle/:clientId/risk-score - Update client risk score
router.put('/:clientId/risk-score', authenticateToken, requireAdminOrReception, [
  body('riskScore').isInt({ min: 0, max: 100 }).withMessage('Risk score must be between 0 and 100'),
  body('notes').optional().trim()
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

    const { clientId } = req.params;
    const { riskScore, notes } = req.body;

    // Get existing lifecycle or create new one
    let lifecycle = await db.get('SELECT * FROM client_lifecycle WHERE client_id = ?', [clientId]);
    
    if (!lifecycle) {
      // Create new lifecycle entry
      await db.run(`
        INSERT INTO client_lifecycle (
          client_id, risk_score, notes
        ) VALUES (?, ?, ?)
      `, [clientId, riskScore, notes || null]);
    } else {
      // Update existing lifecycle
      await db.run(`
        UPDATE client_lifecycle SET
          risk_score = ?,
          notes = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE client_id = ?
      `, [riskScore, notes || lifecycle.notes, clientId]);
    }

    // Auto-update stage based on risk score if needed
    if (riskScore >= 70 && lifecycle?.current_stage === 'active') {
      await db.run(`
        UPDATE client_lifecycle SET
          previous_stage = current_stage,
          current_stage = 'at_risk',
          stage_changed_at = CURRENT_TIMESTAMP,
          stage_changed_by = ?,
          days_in_current_stage = 0
        WHERE client_id = ?
      `, [req.user.id, clientId]);

      // Log automatic stage change
      await db.run(`
        INSERT INTO client_activity_log (
          client_id, activity_type, description, performed_by
        ) VALUES (?, ?, ?, ?)
      `, [
        clientId,
        'status_change',
        `Automatically moved to "at_risk" stage due to high risk score (${riskScore})`,
        req.user.id
      ]);
    }

    // Get updated lifecycle
    const updatedLifecycle = await db.get(`
      SELECT 
        cl.*,
        u.name as stage_changed_by_name
      FROM client_lifecycle cl
      LEFT JOIN users u ON cl.stage_changed_by = u.id
      WHERE cl.client_id = ?
    `, [clientId]);

    res.json({
      success: true,
      message: 'Risk score updated successfully',
      data: updatedLifecycle
    });

  } catch (error) {
    console.error('Update risk score error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/client-lifecycle/overview - Get lifecycle overview across all clients
router.get('/overview', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Get counts by stage
    const stageStats = await db.all(`
      SELECT 
        current_stage,
        COUNT(*) as count,
        AVG(risk_score) as avg_risk_score,
        AVG(lifetime_value) as avg_lifetime_value
      FROM client_lifecycle
      GROUP BY current_stage
      ORDER BY count DESC
    `);

    // Get clients at risk (high risk score)
    const atRiskClients = await db.all(`
      SELECT 
        cl.client_id,
        cl.risk_score,
        cl.current_stage,
        u.name as client_name
      FROM client_lifecycle cl
      JOIN users u ON cl.client_id = u.id
      WHERE cl.risk_score >= 70
      ORDER BY cl.risk_score DESC
      LIMIT 20
    `);

    // Get recent stage changes
    const recentChanges = await db.all(`
      SELECT 
        cl.client_id,
        cl.current_stage,
        cl.previous_stage,
        cl.stage_changed_at,
        u_client.name as client_name,
        u_admin.name as changed_by_name
      FROM client_lifecycle cl
      JOIN users u_client ON cl.client_id = u_client.id
      LEFT JOIN users u_admin ON cl.stage_changed_by = u_admin.id
      WHERE cl.stage_changed_at >= date('now', '-7 days')
      ORDER BY cl.stage_changed_at DESC
      LIMIT 20
    `);

    // Get lifecycle distribution
    const totalClients = await db.get(`
      SELECT COUNT(*) as count FROM users WHERE role = 'client'
    `);

    const clientsWithLifecycle = await db.get(`
      SELECT COUNT(*) as count FROM client_lifecycle
    `);

    res.json({
      success: true,
      data: {
        totalClients: totalClients.count,
        trackedClients: clientsWithLifecycle.count,
        stageDistribution: stageStats,
        atRiskClients,
        recentChanges,
        summary: {
          byStage: stageStats.reduce((acc, item) => {
            acc[item.current_stage] = {
              count: item.count,
              avgRiskScore: Math.round(item.avg_risk_score || 0),
              avgLifetimeValue: item.avg_lifetime_value || 0
            };
            return acc;
          }, {}),
          highRiskCount: atRiskClients.length,
          recentChangesCount: recentChanges.length
        }
      }
    });

  } catch (error) {
    console.error('Get lifecycle overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/client-lifecycle/calculate-risk - Calculate risk score for a client
router.post('/calculate-risk/:clientId', authenticateToken, requireAdminOrReception, async (req, res) => {
  try {
    const { clientId } = req.params;

    // Get client data for risk calculation
    const client = await db.get(`
      SELECT 
        u.*,
        us.remaining_classes,
        us.start_date as subscription_start,
        us.end_date as subscription_end
      FROM users u
      LEFT JOIN user_subscriptions us ON u.id = us.user_id AND us.status = 'active'
      WHERE u.id = ? AND u.role = 'client'
    `, [clientId]);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Get recent activity data
    const activityData = await db.get(`
      SELECT 
        COUNT(*) as total_activities,
        MAX(created_at) as last_activity,
        COUNT(CASE WHEN created_at >= date('now', '-30 days') THEN 1 END) as recent_activities
      FROM client_activity_log
      WHERE client_id = ?
    `, [clientId]);

    // Get booking data
    const bookingData = await db.get(`
      SELECT 
        COUNT(*) as total_bookings,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_bookings,
        COUNT(CASE WHEN status = 'no_show' THEN 1 END) as no_shows,
        MAX(booking_date) as last_booking
      FROM bookings
      WHERE user_id = ?
    `, [clientId]);

    // Calculate risk score (0-100, higher = more at risk)
    let riskScore = 0;

    // No active subscription (+30 points)
    if (!client.remaining_classes) {
      riskScore += 30;
    }

    // Low remaining classes (+20 points if < 3 classes)
    if (client.remaining_classes && client.remaining_classes < 3) {
      riskScore += 20;
    }

    // No recent activity (+25 points if no activity in 30 days)
    if (activityData.recent_activities === 0) {
      riskScore += 25;
    }

    // High cancellation rate (+15 points if > 20%)
    if (bookingData.total_bookings > 0) {
      const cancellationRate = (bookingData.cancelled_bookings + bookingData.no_shows) / bookingData.total_bookings;
      if (cancellationRate > 0.2) {
        riskScore += 15;
      }
    }

    // No recent bookings (+10 points if no booking in 14 days)
    if (bookingData.last_booking) {
      const daysSinceLastBooking = moment().diff(moment(bookingData.last_booking), 'days');
      if (daysSinceLastBooking > 14) {
        riskScore += 10;
      }
    } else {
      riskScore += 20; // No bookings at all
    }

    // Cap at 100
    riskScore = Math.min(riskScore, 100);

    // Update the risk score
    await db.run(`
      INSERT OR REPLACE INTO client_lifecycle (
        client_id, risk_score, updated_at
      ) VALUES (?, ?, CURRENT_TIMESTAMP)
    `, [clientId, riskScore]);

    // Get risk factors for explanation
    const riskFactors = [];
    if (!client.remaining_classes) riskFactors.push('No active subscription');
    if (client.remaining_classes && client.remaining_classes < 3) riskFactors.push('Low remaining classes');
    if (activityData.recent_activities === 0) riskFactors.push('No recent activity');
    if (bookingData.total_bookings > 0 && (bookingData.cancelled_bookings + bookingData.no_shows) / bookingData.total_bookings > 0.2) {
      riskFactors.push('High cancellation rate');
    }
    if (!bookingData.last_booking || moment().diff(moment(bookingData.last_booking), 'days') > 14) {
      riskFactors.push('No recent bookings');
    }

    res.json({
      success: true,
      message: 'Risk score calculated successfully',
      data: {
        riskScore,
        riskLevel: riskScore >= 70 ? 'High' : riskScore >= 40 ? 'Medium' : 'Low',
        riskFactors,
        calculation: {
          noActiveSubscription: !client.remaining_classes,
          lowRemainingClasses: client.remaining_classes && client.remaining_classes < 3,
          noRecentActivity: activityData.recent_activities === 0,
          highCancellationRate: bookingData.total_bookings > 0 && (bookingData.cancelled_bookings + bookingData.no_shows) / bookingData.total_bookings > 0.2,
          noRecentBookings: !bookingData.last_booking || moment().diff(moment(bookingData.last_booking), 'days') > 14
        }
      }
    });

  } catch (error) {
    console.error('Calculate risk score error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/client-lifecycle/update-all-stages - Update lifecycle stages for all clients (automated)
router.post('/update-all-stages', authenticateToken, requireAdmin, async (req, res) => {
  try {
    let updatedCount = 0;

    // Get all clients
    const clients = await db.all('SELECT id FROM users WHERE role = "client"');

    for (const client of clients) {
      // Get current lifecycle
      const lifecycle = await db.get('SELECT * FROM client_lifecycle WHERE client_id = ?', [client.id]);
      
      // Get client's subscription status
      const subscription = await db.get(`
        SELECT * FROM user_subscriptions 
        WHERE user_id = ? AND status = 'active'
        ORDER BY created_at DESC LIMIT 1
      `, [client.id]);

      // Get recent activity
      const recentActivity = await db.get(`
        SELECT COUNT(*) as count FROM client_activity_log
        WHERE client_id = ? AND created_at >= date('now', '-30 days')
      `, [client.id]);

      let newStage = lifecycle?.current_stage || 'prospect';

      // Determine appropriate stage
      if (subscription) {
        if (moment(subscription.created_at).diff(moment(), 'days') <= 30) {
          newStage = 'new_member';
        } else if (recentActivity.count > 0) {
          newStage = 'active';
        } else {
          newStage = 'inactive';
        }
      } else {
        // No active subscription
        if (lifecycle?.current_stage === 'active' || lifecycle?.current_stage === 'new_member') {
          newStage = 'churned';
        }
      }

      // Update stage if changed
      if (!lifecycle || lifecycle.current_stage !== newStage) {
        if (lifecycle) {
          await db.run(`
            UPDATE client_lifecycle SET
              previous_stage = current_stage,
              current_stage = ?,
              stage_changed_at = CURRENT_TIMESTAMP,
              days_in_current_stage = 0,
              updated_at = CURRENT_TIMESTAMP
            WHERE client_id = ?
          `, [newStage, client.id]);
        } else {
          await db.run(`
            INSERT INTO client_lifecycle (client_id, current_stage)
            VALUES (?, ?)
          `, [client.id, newStage]);
        }
        updatedCount++;
      }
    }

    res.json({
      success: true,
      message: `Updated lifecycle stages for ${updatedCount} clients`,
      data: { updatedCount, totalClients: clients.length }
    });

  } catch (error) {
    console.error('Update all stages error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router; 