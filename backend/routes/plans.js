const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, requireAdmin, requireAdminOrReception } = require('../middleware/auth');

const router = express.Router();

// GET /api/plans - Get all subscription plans (public)
router.get('/', async (req, res) => {
  try {
    const { category, equipmentAccess, isActive } = req.query;
    
    let query = 'SELECT * FROM subscription_plans WHERE 1=1';
    const params = [];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (equipmentAccess) {
      query += ' AND equipment_access = ?';
      params.push(equipmentAccess);
    }

    if (isActive !== undefined) {
      query += ' AND is_active = ?';
      params.push(isActive === 'true' ? 1 : 0);
    } else {
      // By default, only show active plans
      query += ' AND is_active = 1';
    }

    query += ' ORDER BY monthly_price ASC';

    const plans = await db.all(query, params);

    // Parse features JSON for each plan
    const formattedPlans = plans.map(plan => ({
      ...plan,
      features: plan.features ? JSON.parse(plan.features) : []
    }));

    res.json({
      success: true,
      data: formattedPlans
    });

  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/plans/:id - Get single plan
router.get('/:id', async (req, res) => {
  try {
    const plan = await db.get('SELECT * FROM subscription_plans WHERE id = ?', [req.params.id]);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }

    // Parse features JSON
    plan.features = plan.features ? JSON.parse(plan.features) : [];

    res.json({
      success: true,
      data: plan
    });

  } catch (error) {
    console.error('Get plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/plans - Create new plan (admin only)
router.post('/', authenticateToken, requireAdminOrReception, [
  body('name').notEmpty().withMessage('Plan name is required'),
  body(['monthlyClasses', 'price', 'monthlyPrice']).custom((value, { req }) => {
    // Accept either monthlyClasses or price/monthlyPrice
    const monthlyClasses = req.body.monthlyClasses;
    const price = req.body.price || req.body.monthlyPrice;
    
    if (!monthlyClasses || monthlyClasses < 1) {
      throw new Error('Monthly classes must be at least 1');
    }
    if (!price || price < 0) {
      throw new Error('Monthly price must be at least 0');
    }
    return true;
  }),
  body('equipmentAccess').isIn(['mat', 'reformer', 'both']).withMessage('Invalid equipment access'),
  body('category').optional().isIn(['group', 'personal', 'personal_duo', 'personal_trio']).withMessage('Invalid category'),
  body('features').isArray().withMessage('Features must be an array'),
  body('description').optional(),
  body('durationMonths').optional().isFloat({ min: 0.01 }).withMessage('Duration must be at least 0.01 months (about 8 hours)')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      name,
      monthlyClasses,
      price,
      monthlyPrice,
      equipmentAccess,
      category = 'group', // Default category
      features,
      description,
      durationMonths = 1 // Default duration
    } = req.body;

    // Use price or monthlyPrice, whichever is provided
    const finalPrice = price || monthlyPrice;

    const result = await db.run(`
      INSERT INTO subscription_plans (
        name, monthly_classes, monthly_price, duration_months, equipment_access, 
        category, features, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      name, monthlyClasses, finalPrice, durationMonths, equipmentAccess,
      category, JSON.stringify(features), description
    ]);

    const newPlan = await db.get('SELECT * FROM subscription_plans WHERE id = ?', [result.id]);
    newPlan.features = JSON.parse(newPlan.features);

    res.status(201).json({
      success: true,
      message: 'Plan created successfully',
      data: newPlan
    });

  } catch (error) {
    console.error('Create plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// PUT /api/plans/:id - Update plan (admin only)
router.put('/:id', authenticateToken, requireAdminOrReception, [
  body('name').optional().notEmpty().withMessage('Plan name cannot be empty'),
  body('monthlyClasses').optional().isInt({ min: 1 }).withMessage('Monthly classes must be at least 1'),
  body('monthlyPrice').optional().isFloat({ min: 0 }).withMessage('Monthly price must be at least 0'),
  body('equipmentAccess').optional().isIn(['mat', 'reformer', 'both']).withMessage('Invalid equipment access'),
  body('category').optional().isIn(['group', 'personal', 'personal_duo', 'personal_trio']).withMessage('Invalid category'),
  body('features').optional().isArray().withMessage('Features must be an array'),
  body('description').optional(),
  body('durationMonths').optional().isFloat({ min: 0.01 }).withMessage('Duration must be at least 0.01 months (about 8 hours)'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean')
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

    const existingPlan = await db.get('SELECT id FROM subscription_plans WHERE id = ?', [req.params.id]);
    if (!existingPlan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }

    const updates = {};
    const allowedFields = ['name', 'monthlyClasses', 'monthlyPrice', 'equipmentAccess', 'category', 'features', 'description', 'durationMonths', 'isActive'];
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'features') {
          updates.features = JSON.stringify(req.body[field]);
        } else if (field === 'monthlyClasses') {
          updates.monthly_classes = req.body[field];
        } else if (field === 'monthlyPrice') {
          updates.monthly_price = req.body[field];
        } else if (field === 'equipmentAccess') {
          updates.equipment_access = req.body[field];
        } else if (field === 'durationMonths') {
          updates.duration_months = req.body[field];
        } else if (field === 'isActive') {
          updates.is_active = req.body[field] ? 1 : 0;
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

    // Validate required fields if they are being updated
    if (updates.name !== undefined && (!updates.name || updates.name.trim().length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'Plan name cannot be empty'
      });
    }

    if (updates.monthly_classes !== undefined && updates.monthly_classes <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Monthly classes must be greater than 0'
      });
    }

    if (updates.monthly_price !== undefined && updates.monthly_price <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Monthly price must be greater than 0'
      });
    }

    // Build update query
    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), req.params.id];

    await db.run(
      `UPDATE subscription_plans SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    // Get updated plan
    const updatedPlan = await db.get('SELECT * FROM subscription_plans WHERE id = ?', [req.params.id]);
    updatedPlan.features = JSON.parse(updatedPlan.features);

    res.json({
      success: true,
      message: 'Plan updated successfully',
      data: updatedPlan
    });

  } catch (error) {
    console.error('Update plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// DELETE /api/plans/:id - Delete plan (admin only)
router.delete('/:id', authenticateToken, requireAdminOrReception, async (req, res) => {
  try {
    const existingPlan = await db.get('SELECT id FROM subscription_plans WHERE id = ?', [req.params.id]);
    if (!existingPlan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }

    // Check if plan has active subscriptions
    const activeSubscriptions = await db.get(
      'SELECT COUNT(*) as count FROM user_subscriptions WHERE plan_id = ? AND status = "active"',
      [req.params.id]
    );

    if (activeSubscriptions.count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete plan with active subscriptions'
      });
    }

    await db.run('DELETE FROM subscription_plans WHERE id = ?', [req.params.id]);

    res.json({
      success: true,
      message: 'Plan deleted successfully'
    });

  } catch (error) {
    console.error('Delete plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router; 