const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'pilates_studio_super_secure_jwt_secret_key_2024';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// POST /api/auth/register
router.post('/register', [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').optional(),
  body('role').optional().isIn(['client', 'instructor', 'admin', 'reception']).withMessage('Invalid role'),
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

    const { name, email, password, phone, role = 'client', emergencyContact, medicalConditions, referralSource } = req.body;

    // Check if user already exists
    const existingUser = await db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await db.run(
      `INSERT INTO users (name, email, password, phone, role, emergency_contact, medical_conditions, referral_source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, email, hashedPassword, phone, role, emergencyContact, medicalConditions, referralSource]
    );

    // Generate token
    const token = generateToken(result.id);

    // Get user data (without password)
    const user = await db.get(
      'SELECT id, name, email, phone, role, emergency_contact, medical_conditions, referral_source, join_date, status FROM users WHERE id = ?',
      [result.id]
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user,
        token
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/auth/login
router.post('/login', [
  body('emailOrPhone').notEmpty().withMessage('Email or phone number is required'),
  body('password').notEmpty().withMessage('Password is required')
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

    const { emailOrPhone, password } = req.body;
    console.log('Login attempt:', emailOrPhone);

    // Get user with password - check both email (case-insensitive) and phone
    const user = await db.get(`
      SELECT * FROM users 
      WHERE LOWER(email) = LOWER(?) OR phone = ?
    `, [emailOrPhone, emailOrPhone]);
    console.log('User found:', user);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'Account is not active'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    console.log('Password valid:', isValidPassword);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate token
    const token = generateToken(user.id);

    // Remove password from user object
    delete user.password;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user,
        token
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    // Get user's current subscription
    const subscription = await db.get(`
      SELECT 
        us.*,
        sp.name as plan_name,
        sp.equipment_access,
        sp.monthly_price
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.user_id = ? AND us.status = 'active'
      ORDER BY us.created_at DESC
      LIMIT 1
    `, [req.user.id]);

    res.json({
      success: true,
      data: {
        user: req.user,
        subscription
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// PUT /api/auth/profile
router.put('/profile', authenticateToken, [
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
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

    const { name, phone, emergencyContact, medicalConditions } = req.body;

    await db.run(
      `UPDATE users SET 
       name = COALESCE(?, name),
       phone = COALESCE(?, phone),
       emergency_contact = COALESCE(?, emergency_contact),
       medical_conditions = COALESCE(?, medical_conditions),
       updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [name, phone, emergencyContact, medicalConditions, req.user.id]
    );

    // Get updated user
    const updatedUser = await db.get(
      'SELECT id, name, email, phone, role, emergency_contact, medical_conditions, join_date, status FROM users WHERE id = ?',
      [req.user.id]
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedUser }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router; 