const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, requireAdmin, requireAdminOrReception } = require('../middleware/auth');

const router = express.Router();

// GET /api/plans - Get all subscription plans (public)
router.get('/', async (req, res) => {
  try {
    const { category, equipmentAccess, isActive } = req.query;
    
    // Use Supabase if available, otherwise fall back to SQLite
    if (db.useSupabase) {
      console.log('🔧 Using direct Supabase REST API for plans list');
      console.log('🔍 Plans query params:', { category, equipmentAccess, isActive });
      
      // Build query parameters for REST API
      const queryParams = new URLSearchParams();
      queryParams.append('select', '*');
      
      if (category) {
        queryParams.append('category', `eq.${category}`);
        console.log('🔍 Added category filter:', category);
      }

      if (equipmentAccess) {
        queryParams.append('equipment_access', `eq.${equipmentAccess}`);
        console.log('🔍 Added equipment filter:', equipmentAccess);
      }

      if (isActive !== undefined) {
        queryParams.append('is_active', `eq.${isActive === 'true' ? 'true' : 'false'}`);
        console.log('🔍 Added isActive filter:', isActive === 'true' ? true : false);
      } else {
        // Show all plans (both active and inactive) by default for now
        console.log('🔍 Showing all plans (active and inactive)');
      }

      queryParams.append('order', 'monthly_price.asc');

      const plansResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/subscription_plans?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        }
      });

      if (!plansResponse.ok) {
        console.error('Supabase plans query error:', await plansResponse.text());
        return res.status(500).json({
          success: false,
          message: 'Database error'
        });
      }

      const plans = await plansResponse.json();
      console.log('🔍 Supabase query result:', { plans, error: null });

      // Parse features JSON for each plan and map fields to camelCase
      const formattedPlans = plans.map(plan => ({
        id: plan.id,
        name: plan.name || '',
        description: plan.description || '',
        monthlyClasses: Number(plan.monthly_classes) || 0,
        monthlyPrice: Number(plan.monthly_price) || 0,
        durationMonths: Number(plan.duration_months) || 1,
        equipmentAccess: plan.equipment_access || 'mat',
        category: plan.category || 'group',
        features: Array.isArray(plan.features) ? plan.features : (plan.features ? JSON.parse(plan.features) : []),
        isActive: plan.is_active === 1 || plan.is_active === true || plan.is_active === 't',
        createdAt: plan.created_at,
        updatedAt: plan.updated_at
      }));
      console.log('🎯 Sending formatted plans to frontend:', formattedPlans.map(p => ({ 
        id: p.id, 
        name: p.name, 
        monthlyPrice: p.monthlyPrice, 
        monthlyClasses: p.monthlyClasses,
        isActive: p.isActive 
      })));
      res.json({
        success: true,
        data: formattedPlans
      });
      return;

    } else {
      // SQLite fallback
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
    }

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

    if (db.useSupabase) {
      console.log('🔧 Using Supabase for plan creation');
      
      const { data: newPlan, error } = await db.supabase
        .from('subscription_plans')
        .insert({
          name,
          monthly_classes: monthlyClasses,
          monthly_price: finalPrice,
          duration_months: durationMonths,
          equipment_access: equipmentAccess,
          category,
          features: JSON.stringify(features),
          description,
          is_active: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase plan creation error:', error);
        return res.status(500).json({
          success: false,
          message: 'Database error'
        });
      }

      // Parse features JSON
      newPlan.features = JSON.parse(newPlan.features);

      console.log('✅ Plan created successfully in Supabase');
      
      res.status(201).json({
        success: true,
        message: 'Plan created successfully',
        data: newPlan
      });
    } else {
      // SQLite fallback
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
    }

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

    if (db.useSupabase) {
      console.log('🔧 Using Supabase for plan update');
      
      // Check if plan exists
      const { data: existingPlan, error: checkError } = await db.supabase
        .from('subscription_plans')
        .select('id')
        .eq('id', req.params.id)
        .single();

      if (checkError || !existingPlan) {
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

      // Add updated_at timestamp
      updates.updated_at = new Date().toISOString();

      // Update plan in Supabase
      const { data: updatedPlan, error } = await db.supabase
        .from('subscription_plans')
        .update(updates)
        .eq('id', req.params.id)
        .select()
        .single();

      if (error) {
        console.error('Supabase plan update error:', error);
        return res.status(500).json({
          success: false,
          message: 'Database error'
        });
      }

      // Parse features JSON
      updatedPlan.features = JSON.parse(updatedPlan.features);

      console.log('✅ Plan updated successfully in Supabase');
      
      res.json({
        success: true,
        message: 'Plan updated successfully',
        data: updatedPlan
      });
      return;
    } else {
      // SQLite fallback
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
    }

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
    if (db.useSupabase) {
      console.log('🔧 Using Supabase for plan deletion');
      
      // Check if plan exists
      const { data: existingPlan, error: checkError } = await db.supabase
        .from('subscription_plans')
        .select('id')
        .eq('id', req.params.id)
        .single();

      if (checkError || !existingPlan) {
        return res.status(404).json({
          success: false,
          message: 'Plan not found'
        });
      }

      // Check if plan has active subscriptions
      const { data: activeSubscriptions, error: subError } = await db.supabase
        .from('user_subscriptions')
        .select('id')
        .eq('plan_id', req.params.id)
        .eq('status', 'active');

      if (subError) {
        console.error('Supabase subscription check error:', subError);
        return res.status(500).json({
          success: false,
          message: 'Database error'
        });
      }

      if (activeSubscriptions && activeSubscriptions.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete plan with active subscriptions'
        });
      }

      // Delete plan
      const { error: deleteError } = await db.supabase
        .from('subscription_plans')
        .delete()
        .eq('id', req.params.id);

      if (deleteError) {
        console.error('Supabase plan deletion error:', deleteError);
        return res.status(500).json({
          success: false,
          message: 'Database error'
        });
      }

      console.log('✅ Plan deleted successfully in Supabase');
      
      res.json({
        success: true,
        message: 'Plan deleted successfully'
      });
    } else {
      // SQLite fallback
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
    }

  } catch (error) {
    console.error('Delete plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router; 