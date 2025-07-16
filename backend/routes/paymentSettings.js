const express = require('express');
const db = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/payment-settings/:userId - Get payment settings for a user
router.get('/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const paymentSettings = await db.get(`
      SELECT * FROM payment_settings 
      WHERE user_id = ?
    `, [userId]);

    if (!paymentSettings) {
      return res.status(404).json({
        success: false,
        message: 'Payment settings not found'
      });
    }

    res.json({
      success: true,
      data: paymentSettings
    });

  } catch (error) {
    console.error('Get payment settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/payment-settings - Create payment settings
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      user_id,
      payment_method,
      auto_renewal,
      requires_admin_approval,
      payment_notes,
      credit_limit,
      preferred_payment_day
    } = req.body;

    const result = await db.run(`
      INSERT INTO payment_settings (
        user_id, payment_method, auto_renewal, requires_admin_approval,
        payment_notes, credit_limit, preferred_payment_day,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `, [
      user_id,
      payment_method || 'cash',
      auto_renewal || false,
      requires_admin_approval !== false, // Default to true
      payment_notes || '',
      credit_limit || null,
      preferred_payment_day || null
    ]);

    const paymentSettings = await db.get(`
      SELECT * FROM payment_settings WHERE id = ?
    `, [result.lastID]);

    res.status(201).json({
      success: true,
      data: paymentSettings
    });

  } catch (error) {
    console.error('Create payment settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// PUT /api/payment-settings/:userId - Update payment settings
router.put('/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      payment_method,
      auto_renewal,
      requires_admin_approval,
      payment_notes,
      credit_limit,
      preferred_payment_day
    } = req.body;

    // Check if settings exist
    const existing = await db.get(`
      SELECT * FROM payment_settings WHERE user_id = ?
    `, [userId]);

    if (!existing) {
      // Create new settings
      const result = await db.run(`
        INSERT INTO payment_settings (
          user_id, payment_method, auto_renewal, requires_admin_approval,
          payment_notes, credit_limit, preferred_payment_day,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `, [
        userId,
        payment_method || 'cash',
        auto_renewal || false,
        requires_admin_approval !== false,
        payment_notes || '',
        credit_limit || null,
        preferred_payment_day || null
      ]);

      const paymentSettings = await db.get(`
        SELECT * FROM payment_settings WHERE id = ?
      `, [result.lastID]);

      return res.json({
        success: true,
        data: paymentSettings
      });
    }

    // Update existing settings
    await db.run(`
      UPDATE payment_settings 
      SET payment_method = ?, auto_renewal = ?, requires_admin_approval = ?,
          payment_notes = ?, credit_limit = ?, preferred_payment_day = ?,
          updated_at = datetime('now')
      WHERE user_id = ?
    `, [
      payment_method !== undefined ? payment_method : existing.payment_method,
      auto_renewal !== undefined ? auto_renewal : existing.auto_renewal,
      requires_admin_approval !== undefined ? requires_admin_approval : existing.requires_admin_approval,
      payment_notes !== undefined ? payment_notes : existing.payment_notes,
      credit_limit !== undefined ? credit_limit : existing.credit_limit,
      preferred_payment_day !== undefined ? preferred_payment_day : existing.preferred_payment_day,
      userId
    ]);

    const updatedSettings = await db.get(`
      SELECT * FROM payment_settings WHERE user_id = ?
    `, [userId]);

    res.json({
      success: true,
      data: updatedSettings
    });

  } catch (error) {
    console.error('Update payment settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// DELETE /api/payment-settings/:userId - Delete payment settings
router.delete('/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    await db.run(`
      DELETE FROM payment_settings WHERE user_id = ?
    `, [userId]);

    res.json({
      success: true,
      message: 'Payment settings deleted successfully'
    });

  } catch (error) {
    console.error('Delete payment settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router; 