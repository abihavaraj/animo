const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/manual-credits/:userId - Get manual credits for a user
router.get('/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const credits = await db.all(`
      SELECT 
        mc.*,
        u.name as admin_name
      FROM manual_credits mc
      LEFT JOIN users u ON mc.admin_id = u.id
      WHERE mc.user_id = ?
      ORDER BY mc.created_at DESC
    `, [userId]);

    // Calculate total credit balance
    const balance = await db.get(`
      SELECT 
        COALESCE(SUM(amount), 0) as total_credits,
        COALESCE(SUM(classes_added), 0) as total_classes
      FROM manual_credits 
      WHERE user_id = ?
    `, [userId]);

    res.json({
      success: true,
      data: {
        credits: credits || [],
        balance: {
          total_credits: balance.total_credits || 0,
          total_classes: balance.total_classes || 0
        }
      }
    });

  } catch (error) {
    console.error('Get manual credits error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/manual-credits - Add manual credit
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      userId,
      amount,
      classesAdded = 0, // Default to 0 if not provided
      reason,
      description,
      receiptNumber
    } = req.body;

    if (!userId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'User ID and amount are required'
      });
    }

    const result = await db.run(`
      INSERT INTO manual_credits (
        user_id, admin_id, amount, classes_added, reason,
        description, receipt_number, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `, [
      userId,
      req.user.id, // Admin adding the credit
      amount,
      classesAdded,
      reason || 'cash_payment',
      description || '',
      receiptNumber || null
    ]);

    // Get the created credit with admin name
    const credit = await db.get(`
      SELECT 
        mc.*,
        u.name as admin_name
      FROM manual_credits mc
      LEFT JOIN users u ON mc.admin_id = u.id
      WHERE mc.id = ?
    `, [result.lastID]);

    // Update user's credit balance (but don't auto-convert credits to classes)
    await db.run(`
      UPDATE users 
      SET credit_balance = COALESCE(credit_balance, 0) + ?
      WHERE id = ?
    `, [amount, userId]);

    // Only add actual classes if classesAdded > 0 (when admin explicitly adds classes)
    if (classesAdded > 0) {
      await db.run(`
        UPDATE users 
        SET remaining_classes = COALESCE(remaining_classes, 0) + ?
        WHERE id = ?
      `, [classesAdded, userId]);
    }

    res.status(201).json({
      success: true,
      data: credit
    });

  } catch (error) {
    console.error('Add manual credit error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/manual-credits/balance/:userId - Get user's current credit balance
router.get('/balance/:userId', authenticateToken, async (req, res) => {
  try {
    let { userId } = req.params;
    
    // Handle "me" case - user requesting their own balance
    if (userId === 'me') {
      userId = req.user.id.toString();
    }
    
    // Allow users to check their own balance, admins can check anyone's
    if (req.user.role !== 'admin' && req.user.id !== parseInt(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const user = await db.get(`
      SELECT 
        credit_balance,
        remaining_classes,
        name,
        email
      FROM users 
      WHERE id = ?
    `, [userId]);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

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
        user: {
          name: user.name,
          email: user.email,
          credit_balance: user.credit_balance || 0,
          remaining_classes: 0 // Credits don't convert to classes anymore
        },
        recent_credits: recentCredits
      }
    });

  } catch (error) {
    console.error('Get credit balance error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// PUT /api/manual-credits/:id - Update manual credit (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { description, receipt_number } = req.body;

    await db.run(`
      UPDATE manual_credits 
      SET description = ?, receipt_number = ?
      WHERE id = ?
    `, [description, receipt_number, id]);

    const updatedCredit = await db.get(`
      SELECT 
        mc.*,
        u.name as admin_name
      FROM manual_credits mc
      LEFT JOIN users u ON mc.admin_id = u.id
      WHERE mc.id = ?
    `, [id]);

    res.json({
      success: true,
      data: updatedCredit
    });

  } catch (error) {
    console.error('Update manual credit error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/manual-credits/use-credit - Use credits for subscription purchase
router.post('/use-credit', authenticateToken, async (req, res) => {
  try {
    const { amount, description } = req.body;
    const userId = req.user.id;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required'
      });
    }

    // Check user's current balance
    const user = await db.get(`
      SELECT credit_balance, remaining_classes 
      FROM users 
      WHERE id = ?
    `, [userId]);

    if (!user || (user.credit_balance || 0) < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient credit balance'
      });
    }

    // Deduct the credit
    await db.run(`
      UPDATE users 
      SET credit_balance = COALESCE(credit_balance, 0) - ?
      WHERE id = ?
    `, [amount, userId]);

    // Record the credit usage
    await db.run(`
      INSERT INTO manual_credits (
        user_id, admin_id, amount, classes_added, reason, description
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [userId, userId, -amount, 0, 'subscription_purchase', description || 'Credit used for subscription']);

    // Get updated balance
    const updatedUser = await db.get(`
      SELECT credit_balance, remaining_classes 
      FROM users 
      WHERE id = ?
    `, [userId]);

    res.json({
      success: true,
      data: {
        credit_used: amount,
        remaining_balance: updatedUser.credit_balance || 0,
        remaining_classes: updatedUser.remaining_classes || 0
      }
    });

  } catch (error) {
    console.error('Use credit error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router; 