const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireAdmin, requireAdminOrReception } = require('../middleware/auth');

const router = express.Router();

// GET /api/payments - Get user payments
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = `
      SELECT 
        p.*,
        sp.name as subscription_plan_name,
        sp.monthly_classes
      FROM payments p
      LEFT JOIN user_subscriptions us ON p.subscription_id = us.id
      LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE p.user_id = ?
    `;
    
    const params = [req.user.id];

    if (status) {
      query += ' AND p.status = ?';
      params.push(status);
    }

    query += ' ORDER BY p.payment_date DESC';

    const payments = await db.all(query, params);

    res.json({
      success: true,
      data: payments
    });

  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/payments/stats - Get payment statistics for current user
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const totalPaid = await db.get(`
      SELECT 
        COUNT(*) as total_payments,
        SUM(amount) as total_amount,
        AVG(amount) as average_amount
      FROM payments 
      WHERE user_id = ? AND status = 'completed'
    `, [req.user.id]);

    const pendingPayments = await db.get(`
      SELECT 
        COUNT(*) as pending_count,
        COALESCE(SUM(amount), 0) as pending_amount
      FROM payments 
      WHERE user_id = ? AND status = 'pending'
    `, [req.user.id]);

    const thisMonthPayments = await db.get(`
      SELECT 
        COUNT(*) as month_payments,
        COALESCE(SUM(amount), 0) as month_amount
      FROM payments 
      WHERE user_id = ? AND status = 'completed'
      AND payment_date >= date('now', 'start of month')
    `, [req.user.id]);

    res.json({
      success: true,
      data: {
        totalPayments: totalPaid.total_payments || 0,
        totalAmount: totalPaid.total_amount || 0,
        averageAmount: totalPaid.average_amount || 0,
        pendingCount: pendingPayments.pending_count || 0,
        pendingAmount: pendingPayments.pending_amount || 0,
        thisMonthPayments: thisMonthPayments.month_payments || 0,
        thisMonthAmount: thisMonthPayments.month_amount || 0
      }
    });

  } catch (error) {
    console.error('Get payment stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/payments/all - Get all payments (admin/reception only)
router.get('/all', authenticateToken, requireAdminOrReception, async (req, res) => {
  try {
    const { userId, status, startDate, endDate } = req.query;
    
    let query = `
      SELECT 
        p.*,
        u.name as user_name,
        u.email as user_email,
        sp.name as subscription_plan_name
      FROM payments p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN user_subscriptions us ON p.subscription_id = us.id
      LEFT JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE 1=1
    `;
    
    const params = [];

    if (userId) {
      query += ' AND p.user_id = ?';
      params.push(userId);
    }

    if (status) {
      query += ' AND p.status = ?';
      params.push(status);
    }

    if (startDate) {
      query += ' AND p.payment_date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND p.payment_date <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY p.payment_date DESC';

    const payments = await db.all(query, params);

    res.json({
      success: true,
      data: payments
    });

  } catch (error) {
    console.error('Get all payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/payments/revenue - Get revenue statistics (admin only)
router.get('/revenue', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const totalRevenue = await db.get(`
      SELECT 
        COUNT(*) as total_payments,
        SUM(amount) as total_revenue
      FROM payments 
      WHERE status = 'completed'
    `);

    const thisMonthRevenue = await db.get(`
      SELECT 
        COUNT(*) as month_payments,
        COALESCE(SUM(amount), 0) as month_revenue
      FROM payments 
      WHERE status = 'completed'
      AND payment_date >= date('now', 'start of month')
    `);

    const thisYearRevenue = await db.get(`
      SELECT 
        COUNT(*) as year_payments,
        COALESCE(SUM(amount), 0) as year_revenue
      FROM payments 
      WHERE status = 'completed'
      AND payment_date >= date('now', 'start of year')
    `);

    const pendingRevenue = await db.get(`
      SELECT 
        COUNT(*) as pending_payments,
        COALESCE(SUM(amount), 0) as pending_revenue
      FROM payments 
      WHERE status = 'pending'
    `);

    // Monthly revenue breakdown for the last 12 months
    const monthlyRevenue = await db.all(`
      SELECT 
        strftime('%Y-%m', payment_date) as month,
        COUNT(*) as payments,
        SUM(amount) as revenue
      FROM payments 
      WHERE status = 'completed'
      AND payment_date >= date('now', '-12 months')
      GROUP BY strftime('%Y-%m', payment_date)
      ORDER BY month DESC
    `);

    res.json({
      success: true,
      data: {
        totalRevenue: totalRevenue.total_revenue || 0,
        totalPayments: totalRevenue.total_payments || 0,
        thisMonthRevenue: thisMonthRevenue.month_revenue || 0,
        thisMonthPayments: thisMonthRevenue.month_payments || 0,
        thisYearRevenue: thisYearRevenue.year_revenue || 0,
        thisYearPayments: thisYearRevenue.year_payments || 0,
        pendingRevenue: pendingRevenue.pending_revenue || 0,
        pendingPayments: pendingRevenue.pending_payments || 0,
        monthlyBreakdown: monthlyRevenue
      }
    });

  } catch (error) {
    console.error('Get revenue stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router; 