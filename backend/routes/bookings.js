const express = require('express');
const { body, validationResult } = require('express-validator');
const moment = require('moment');
const db = require('../config/database');
const { authenticateToken, requireAdmin, requireAdminOrReception, requireInstructor } = require('../middleware/auth');

const router = express.Router();

// GET /api/bookings - Get bookings
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { userId, classId, status, date } = req.query;
    
    let query = `
      SELECT 
        b.*,
        c.name as class_name,
        c.date as class_date,
        c.time as class_time,
        c.level as class_level,
        c.equipment_type,
        c.room,
        u.name as user_name,
        u.email as user_email,
        i.name as instructor_name
      FROM bookings b
      JOIN classes c ON b.class_id = c.id
      JOIN users u ON b.user_id = u.id
      JOIN users i ON c.instructor_id = i.id
      WHERE 1=1
    `;
    
    const params = [];

    // If user is not admin/instructor, only show their own bookings
    if (req.user.role === 'client') {
      query += ' AND b.user_id = ?';
      params.push(req.user.id);
    } else if (userId && (req.user.role === 'admin' || req.user.role === 'reception')) {
      query += ' AND b.user_id = ?';
      params.push(userId);
    }

    if (classId) {
      query += ' AND b.class_id = ?';
      params.push(classId);
    }

    if (status) {
      query += ' AND b.status = ?';
      params.push(status);
    }

    if (date) {
      query += ' AND c.date = ?';
      params.push(date);
    }

    query += ' ORDER BY c.date DESC, c.time DESC';

    const bookings = await db.all(query, params);

    res.json({
      success: true,
      data: bookings
    });

  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/bookings/:id - Get single booking
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const booking = await db.get(`
      SELECT 
        b.*,
        c.name as class_name,
        c.date as class_date,
        c.time as class_time,
        c.level as class_level,
        c.equipment_type,
        c.room,
        c.capacity,
        u.name as user_name,
        u.email as user_email,
        i.name as instructor_name
      FROM bookings b
      JOIN classes c ON b.class_id = c.id
      JOIN users u ON b.user_id = u.id
      JOIN users i ON c.instructor_id = i.id
      WHERE b.id = ?
    `, [req.params.id]);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check permissions
    if (req.user.role === 'client' && booking.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: booking
    });

  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/bookings - Create new booking
router.post('/', authenticateToken, [
  body('classId').isInt({ min: 1 }).withMessage('Valid class ID is required')
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

    const { classId } = req.body;

    // Get class details
    const class_ = await db.get('SELECT * FROM classes WHERE id = ? AND status = "active"', [classId]);
    if (!class_) {
      return res.status(404).json({
        success: false,
        message: 'Class not found or not available'
      });
    }

    // Check if class is in the future
    const classDateTime = moment(`${class_.date} ${class_.time}`);
    if (classDateTime.isBefore(moment())) {
      return res.status(400).json({
        success: false,
        message: 'Cannot book past classes'
      });
    }

    // Check if user already has a booking for this class
    const existingBooking = await db.get(
      'SELECT id FROM bookings WHERE user_id = ? AND class_id = ? AND status IN ("confirmed", "waitlist")',
      [req.user.id, classId]
    );

    if (existingBooking) {
      return res.status(400).json({
        success: false,
        message: 'You already have a booking for this class'
      });
    }

    // Update the subscription query:
    let subscription = await db.get(`
      SELECT us.*, sp.equipment_access, sp.category
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.user_id = ? 
        AND (us.status = 'active' OR (us.status = 'cancelled' AND us.remaining_classes > 0))
        AND DATE(us.end_date) >= DATE('now')
      ORDER BY us.created_at DESC
      LIMIT 1
    `, [req.user.id]);

    // Users must have a valid subscription to book classes
    if (!subscription) {
      return res.status(400).json({
        success: false,
        message: 'You need an active subscription plan to book classes. Please purchase a plan first.'
      });
    }

    // Check if subscription has remaining classes
    if (subscription.remaining_classes <= 0) {
      return res.status(400).json({
        success: false,
        message: 'No remaining classes in your subscription. Please renew or upgrade your plan.'
      });
    }

    // Check personal subscription restrictions
    const isPersonalSubscription = subscription.category === 'personal';
    const isPersonalClass = class_.category === 'personal';

    if (isPersonalSubscription && !isPersonalClass) {
      return res.status(400).json({
        success: false,
        message: 'Your personal subscription only allows booking personal/private classes. Please choose a personal training session.'
      });
    }

    if (!isPersonalSubscription && isPersonalClass) {
      return res.status(400).json({
        success: false,
        message: 'This is a personal training session. You need a personal subscription to book this class.'
      });
    }

    // Check equipment access
    const canAccess = 
      subscription.equipment_access === 'both' || 
      subscription.equipment_access === class_.equipment_type ||
      (subscription.equipment_access === 'mat' && class_.equipment_type === 'mat') ||
      (subscription.equipment_access === 'reformer' && class_.equipment_type === 'reformer');

    if (!canAccess) {
      return res.status(400).json({
        success: false,
        message: `Your subscription doesn't include access to ${class_.equipment_type} classes`
      });
    }

    // Check class capacity
    const currentEnrollment = await db.get(
      'SELECT COUNT(*) as count FROM bookings WHERE class_id = ? AND status = "confirmed"',
      [classId]
    );

    if (currentEnrollment.count >= class_.capacity) {
      // Check if user is already on waitlist for this class
      const existingWaitlist = await db.get(
        'SELECT * FROM waitlist WHERE user_id = ? AND class_id = ?',
        [req.user.id, classId]
      );

      if (existingWaitlist) {
        return res.status(400).json({
          success: false,
          message: `You are already on the waitlist for this class (position #${existingWaitlist.position}).`,
          data: {
            waitlisted: true,
            position: existingWaitlist.position
          }
        });
      }

      // Add to waitlist
      const waitlistPosition = await db.get(
        'SELECT COUNT(*) + 1 as position FROM waitlist WHERE class_id = ?',
        [classId]
      );

      await db.run(
        'INSERT INTO waitlist (user_id, class_id, position) VALUES (?, ?, ?)',
        [req.user.id, classId, waitlistPosition.position]
      );

      return res.status(202).json({
        success: true,
        message: `Class is full. You have been added to the waitlist at position #${waitlistPosition.position}.`,
        data: { 
          waitlisted: true, 
          position: waitlistPosition.position 
        }
      });
    }

    // Start transaction
    await db.run('BEGIN TRANSACTION');

    try {
      // Create booking
      const bookingResult = await db.run(`
        INSERT INTO bookings (user_id, class_id, subscription_id)
        VALUES (?, ?, ?)
      `, [req.user.id, classId, subscription.id]);

      // Decrease remaining classes in subscription
      await db.run(
        'UPDATE user_subscriptions SET remaining_classes = remaining_classes - 1 WHERE id = ?',
        [subscription.id]
      );

      // Update class enrollment count
      await db.run(
        'UPDATE classes SET enrolled = enrolled + 1 WHERE id = ?',
        [classId]
      );

      // Commit transaction
      await db.run('COMMIT');

      // Get the created booking with all details
      const newBooking = await db.get(`
        SELECT 
          b.*,
          c.name as class_name,
          c.date as class_date,
          c.time as class_time,
          c.level as class_level,
          c.equipment_type,
          c.room
        FROM bookings b
        JOIN classes c ON b.class_id = c.id
        WHERE b.id = ?
      `, [bookingResult.id]);

      // Schedule reminder notification for this booking
      try {
        // Get user notification settings first (this is the priority)
        const userSettings = await db.get(`
          SELECT * FROM notification_settings WHERE user_id = ?
        `, [req.user.id]);
        
        const userEnableNotifications = userSettings?.enable_notifications !== 0;
        const userReminderMinutes = userSettings?.default_reminder_minutes || 15;
        
        if (userEnableNotifications) {
          // Get class notification settings as fallback
          const classSettings = await db.get(`
            SELECT * FROM class_notification_settings WHERE class_id = ?
          `, [classId]);
          
          const classEnableNotifications = classSettings?.enable_notifications !== 0;
          
          // Only schedule if both user and class have notifications enabled
          if (classEnableNotifications) {
            const classDateTime = new Date(`${newBooking.class_date}T${newBooking.class_time}`);
            const notificationTime = new Date(classDateTime.getTime() - (userReminderMinutes * 60 * 1000));
            
            // Only schedule if notification time is in the future
            if (notificationTime > new Date()) {
              const message = `🧘‍♀️ Reminder: Your ${newBooking.class_name} class starts in ${userReminderMinutes} minutes!`;
              
              await db.run(`
                INSERT INTO notifications (class_id, user_id, type, message, scheduled_time)
                VALUES (?, ?, 'reminder', ?, ?)
              `, [classId, req.user.id, message, notificationTime.toISOString()]);
              
              console.log(`📅 Scheduled reminder notification for user ${req.user.id} - class "${newBooking.class_name}" (${userReminderMinutes} minutes before - using user's personal settings)`);
            }
          }
        }
      } catch (notificationError) {
        console.error('Error scheduling notification for booking:', notificationError);
        // Don't fail booking if notification scheduling fails
      }

      res.status(201).json({
        success: true,
        message: 'Class booked successfully',
        data: newBooking
      });

    } catch (transactionError) {
      await db.run('ROLLBACK');
      throw transactionError;
    }

  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// PUT /api/bookings/:id/cancel - Cancel booking
router.put('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const booking = await db.get(`
      SELECT 
        b.*,
        c.date,
        c.time,
        c.capacity,
        c.name as class_name,
        u.name as instructor_name
      FROM bookings b
      JOIN classes c ON b.class_id = c.id
      LEFT JOIN users u ON c.instructor_id = u.id
      WHERE b.id = ?
    `, [req.params.id]);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check permissions
    if (req.user.role === 'client' && booking.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Booking is already cancelled'
      });
    }

    // Check if cancellation is allowed (at least 2 hours before class)
    const classDateTime = moment(`${booking.date} ${booking.time}`);
    const currentTime = moment();
    const hoursDifference = classDateTime.diff(currentTime, 'hours', true);

    if (hoursDifference < 2) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel booking less than 2 hours before class. Class starts in ${hoursDifference.toFixed(1)} hours.`
      });
    }

    // Check if class was full before cancellation
    const currentEnrollment = await db.get(
      'SELECT COUNT(*) as count FROM bookings WHERE class_id = ? AND status = "confirmed"',
      [booking.class_id]
    );

    const wasClassFull = currentEnrollment.count >= booking.capacity;

    await db.run('BEGIN TRANSACTION');

    try {
      // Delete the cancelled booking instead of just updating status
      // This prevents unique constraint errors when rebooking
      await db.run(
        'DELETE FROM bookings WHERE id = ?',
        [req.params.id]
      );

      // Handle refund based on booking type
      if (booking.subscription_id) {
        // Refund class to subscription
        await db.run(
          'UPDATE user_subscriptions SET remaining_classes = remaining_classes + 1 WHERE id = ?',
          [booking.subscription_id]
        );
      }

      // Update class enrollment count
      await db.run(
        'UPDATE classes SET enrolled = enrolled - 1 WHERE id = ?',
        [booking.class_id]
      );

      // If class was full, automatically promote next person from waitlist
      if (wasClassFull) {
        // Get next person in waitlist
        const nextInLine = await db.get(
          'SELECT w.*, u.name as user_name, u.email as user_email FROM waitlist w JOIN users u ON w.user_id = u.id WHERE w.class_id = ? ORDER BY w.position LIMIT 1',
          [booking.class_id]
        );

        if (nextInLine) {
          // Create their booking automatically
          let userSubscription = await db.get(`
            SELECT us.* FROM user_subscriptions us
            WHERE us.user_id = ? AND us.status = 'active'
            ORDER BY us.created_at DESC LIMIT 1
          `, [nextInLine.user_id]);

          // If no active subscription, check for cancelled with remaining classes
          if (!userSubscription) {
            userSubscription = await db.get(`
              SELECT us.* FROM user_subscriptions us
              WHERE us.user_id = ? 
                AND us.status = 'cancelled' 
                AND us.remaining_classes > 0
                AND DATE(us.end_date) >= DATE('now')
              ORDER BY us.created_at DESC LIMIT 1
            `, [nextInLine.user_id]);
          }

          if (userSubscription && (userSubscription.remaining_classes > 0 || userSubscription.plan_type === 'unlimited')) {
            // Create booking for waitlisted user
            await db.run(`
              INSERT INTO bookings (user_id, class_id, subscription_id)
              VALUES (?, ?, ?)
            `, [nextInLine.user_id, booking.class_id, userSubscription.id]);

            // Update subscription
            if (userSubscription.plan_type !== 'unlimited') {
              await db.run(
                'UPDATE user_subscriptions SET remaining_classes = remaining_classes - 1 WHERE id = ?',
                [userSubscription.id]
              );
            }

            // Update class enrollment back to full
            await db.run(
              'UPDATE classes SET enrolled = enrolled + 1 WHERE id = ?',
              [booking.class_id]
            );

            // Remove from waitlist
            await db.run('DELETE FROM waitlist WHERE id = ?', [nextInLine.id]);
            
            // Update other waitlist positions
            await db.run(
              'UPDATE waitlist SET position = position - 1 WHERE class_id = ? AND position > ?',
              [booking.class_id, nextInLine.position]
            );

            // Schedule notification for the promoted user
            const notificationTime = new Date().toISOString();
            const classDate = new Date(booking.date).toLocaleDateString();
            const message = `🎉 Great news! A spot opened up in "${booking.class_name}" on ${classDate} at ${booking.time}. You are now booked automatically!`;
            
            await db.run(`
              INSERT INTO notifications (class_id, user_id, type, message, scheduled_time)
              VALUES (?, ?, 'waitlist_promotion', ?, ?)
            `, [booking.class_id, nextInLine.user_id, message, notificationTime]);

            console.log(`📋 Promoted ${nextInLine.user_name} from waitlist for class "${booking.class_name}"`);
          }
        }
      }

      await db.run('COMMIT');

      const responseMessage = wasClassFull 
        ? 'Booking cancelled successfully. The next person on the waitlist has been automatically booked and notified.'
        : 'Booking cancelled successfully';

      res.json({
        success: true,
        message: responseMessage,
        data: {
          cancelledAt: new Date().toISOString(),
          hoursBeforeClass: hoursDifference.toFixed(1),
          waitlistPromoted: wasClassFull
        }
      });

    } catch (transactionError) {
      await db.run('ROLLBACK');
      throw transactionError;
    }

  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// PUT /api/bookings/:id/checkin - Check in to class (instructor/admin)
router.put('/:id/checkin', authenticateToken, requireInstructor, async (req, res) => {
  try {
    const booking = await db.get('SELECT * FROM bookings WHERE id = ?', [req.params.id]);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        message: 'Only confirmed bookings can be checked in'
      });
    }

    if (booking.checked_in) {
      return res.status(400).json({
        success: false,
        message: 'User is already checked in'
      });
    }

    await db.run(`
      UPDATE bookings SET 
        checked_in = 1,
        check_in_time = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [req.params.id]);

    res.json({
      success: true,
      message: 'User checked in successfully'
    });

  } catch (error) {
    console.error('Check in error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// PUT /api/bookings/:id/complete - Mark booking as completed (instructor/admin)
router.put('/:id/complete', authenticateToken, requireInstructor, async (req, res) => {
  try {
    const booking = await db.get('SELECT * FROM bookings WHERE id = ?', [req.params.id]);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    await db.run(
      'UPDATE bookings SET status = "completed", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [req.params.id]
    );

    res.json({
      success: true,
      message: 'Booking marked as completed'
    });

  } catch (error) {
    console.error('Complete booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/bookings/class/:classId/attendees - Get class attendees (instructor/admin)
router.get('/class/:classId/attendees', authenticateToken, requireInstructor, async (req, res) => {
  try {
    const attendees = await db.all(`
      SELECT 
        b.*,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone,
        u.emergency_contact,
        u.medical_conditions
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      WHERE b.class_id = ? AND b.status = 'confirmed'
      ORDER BY u.name
    `, [req.params.classId]);

    res.json({
      success: true,
      data: attendees
    });

  } catch (error) {
    console.error('Get attendees error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/bookings/waitlist - Join class waitlist
router.post('/waitlist', authenticateToken, [
  body('classId').isInt({ min: 1 }).withMessage('Valid class ID is required')
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

    const { classId } = req.body;

    // Get class details
    const class_ = await db.get('SELECT * FROM classes WHERE id = ? AND status = "active"', [classId]);
    if (!class_) {
      return res.status(404).json({
        success: false,
        message: 'Class not found or not available'
      });
    }

    // Check if class is in the future
    const classDateTime = moment(`${class_.date} ${class_.time}`);
    if (classDateTime.isBefore(moment())) {
      return res.status(400).json({
        success: false,
        message: 'Cannot join waitlist for past classes'
      });
    }

    // Check if user already has a confirmed booking
    const existingBooking = await db.get(
      'SELECT id FROM bookings WHERE user_id = ? AND class_id = ? AND status = "confirmed"',
      [req.user.id, classId]
    );

    if (existingBooking) {
      return res.status(400).json({
        success: false,
        message: 'You are already booked for this class'
      });
    }

    // Check if user is already on waitlist
    const existingWaitlist = await db.get(
      'SELECT id FROM waitlist WHERE user_id = ? AND class_id = ?',
      [req.user.id, classId]
    );

    if (existingWaitlist) {
      return res.status(400).json({
        success: false,
        message: 'You are already on the waitlist for this class'
      });
    }

    // Check if class is actually full
    const currentEnrollment = await db.get(
      'SELECT COUNT(*) as count FROM bookings WHERE class_id = ? AND status = "confirmed"',
      [classId]
    );

    if (currentEnrollment.count < class_.capacity) {
      return res.status(400).json({
        success: false,
        message: 'Class has available spots. Please book directly instead of joining waitlist.'
      });
    }

    // Get next position in waitlist
    const nextPosition = await db.get(
      'SELECT COALESCE(MAX(position), 0) + 1 as position FROM waitlist WHERE class_id = ?',
      [classId]
    );

    // Add to waitlist
    const result = await db.run(
      'INSERT INTO waitlist (user_id, class_id, position) VALUES (?, ?, ?)',
      [req.user.id, classId, nextPosition.position]
    );

    res.status(201).json({
      success: true,
      message: `Added to waitlist for "${class_.name}"`,
      data: {
        waitlistId: result.id,
        position: nextPosition.position,
        className: class_.name,
        classDate: class_.date,
        classTime: class_.time
      }
    });

  } catch (error) {
    console.error('Join waitlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// DELETE /api/bookings/waitlist/:waitlistId - Leave waitlist
router.delete('/waitlist/:waitlistId', authenticateToken, async (req, res) => {
  try {
    const waitlistEntry = await db.get(
      'SELECT * FROM waitlist WHERE id = ?',
      [req.params.waitlistId]
    );

    if (!waitlistEntry) {
      return res.status(404).json({
        success: false,
        message: 'Waitlist entry not found'
      });
    }

    // Check permissions
    if (req.user.role === 'client' && waitlistEntry.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await db.run('BEGIN TRANSACTION');

    try {
      // Remove from waitlist
      await db.run('DELETE FROM waitlist WHERE id = ?', [req.params.waitlistId]);
      
      // Update positions of other waitlist entries
      await db.run(
        'UPDATE waitlist SET position = position - 1 WHERE class_id = ? AND position > ?',
        [waitlistEntry.class_id, waitlistEntry.position]
      );

      await db.run('COMMIT');

      res.json({
        success: true,
        message: 'Removed from waitlist successfully'
      });

    } catch (transactionError) {
      await db.run('ROLLBACK');
      throw transactionError;
    }

  } catch (error) {
    console.error('Leave waitlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/bookings/waitlist/user - Get user's waitlist entries
router.get('/waitlist/user', authenticateToken, async (req, res) => {
  try {
    const waitlistEntries = await db.all(`
      SELECT 
        w.*,
        c.name as class_name,
        c.date as class_date,
        c.time as class_time,
        c.level as class_level,
        c.room,
        u.name as instructor_name
      FROM waitlist w
      JOIN classes c ON w.class_id = c.id
      LEFT JOIN users u ON c.instructor_id = u.id
      WHERE w.user_id = ?
      ORDER BY c.date, c.time
    `, [req.user.id]);

    res.json({
      success: true,
      data: waitlistEntries
    });

  } catch (error) {
    console.error('Get user waitlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/bookings/class/:classId/waitlist - Get class waitlist (admin/instructor only)
router.get('/class/:classId/waitlist', authenticateToken, requireInstructor, async (req, res) => {
  try {
    const waitlistEntries = await db.all(`
      SELECT 
        w.*,
        u.name as user_name,
        u.email as user_email
      FROM waitlist w
      JOIN users u ON w.user_id = u.id
      WHERE w.class_id = ?
      ORDER BY w.position
    `, [req.params.classId]);

    res.json({
      success: true,
      data: waitlistEntries
    });

  } catch (error) {
    console.error('Get class waitlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/bookings/user/:userId - Get all bookings for a specific user (admin only)
router.get('/user/:userId', authenticateToken, requireAdminOrReception, async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, startDate, endDate } = req.query;
    
    let query = `
      SELECT 
        b.*,
        c.name as class_name,
        c.date as class_date,
        c.time as class_time,
        c.equipment_type,
        c.room,
        u_instructor.name as instructor_name
      FROM bookings b
      JOIN classes c ON b.class_id = c.id
      JOIN users u_instructor ON c.instructor_id = u_instructor.id
      WHERE b.user_id = ?
    `;
    
    const params = [userId];

    if (status) {
      query += ' AND b.status = ?';
      params.push(status);
    }

    if (startDate) {
      query += ' AND c.date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND c.date <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY c.date DESC, c.time DESC';

    const bookings = await db.all(query, params);

    res.json({
      success: true,
      data: bookings
    });

  } catch (error) {
    console.error('Get user bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/bookings/user/:userId/stats - Get booking statistics for a specific user (admin only)
router.get('/user/:userId/stats', authenticateToken, requireAdminOrReception, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get total bookings
    const totalBookings = await db.get(`
      SELECT COUNT(*) as count FROM bookings WHERE user_id = ?
    `, [userId]);

    // Get bookings by status
    const statusBreakdown = await db.all(`
      SELECT 
        status,
        COUNT(*) as count
      FROM bookings 
      WHERE user_id = ?
      GROUP BY status
    `, [userId]);

    // Get attendance rate (confirmed + completed vs total)
    const attendanceStats = await db.get(`
      SELECT 
        COUNT(*) as total_bookings,
        SUM(CASE WHEN status IN ('confirmed', 'completed') THEN 1 ELSE 0 END) as attended_bookings
      FROM bookings 
      WHERE user_id = ?
    `, [userId]);

    const attendanceRate = attendanceStats.total_bookings > 0 
      ? Math.round((attendanceStats.attended_bookings / attendanceStats.total_bookings) * 100)
      : 0;

    // Get favorite instructor
    const favoriteInstructor = await db.get(`
      SELECT 
        u.name as instructor_name,
        COUNT(*) as booking_count
      FROM bookings b
      JOIN classes c ON b.class_id = c.id
      JOIN users u ON c.instructor_id = u.id
      WHERE b.user_id = ? AND b.status IN ('confirmed', 'completed')
      GROUP BY u.id, u.name
      ORDER BY booking_count DESC
      LIMIT 1
    `, [userId]);

    // Get last activity
    const lastActivity = await db.get(`
      SELECT 
        c.date as class_date,
        c.time as class_time,
        c.name as class_name
      FROM bookings b
      JOIN classes c ON b.class_id = c.id
      WHERE b.user_id = ?
      ORDER BY b.created_at DESC
      LIMIT 1
    `, [userId]);

    res.json({
      success: true,
      data: {
        totalBookings: totalBookings.count,
        statusBreakdown: statusBreakdown.reduce((acc, item) => {
          acc[item.status] = item.count;
          return acc;
        }, {}),
        attendanceRate,
        favoriteInstructor: favoriteInstructor?.instructor_name || null,
        lastActivity: lastActivity ? {
          date: lastActivity.class_date,
          time: lastActivity.class_time,
          className: lastActivity.class_name
        } : null
      }
    });

  } catch (error) {
    console.error('Get user booking stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/bookings/waitlist/:userId - Get user's waitlist entries
router.get('/waitlist/:userId', authenticateToken, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    // Check permissions
    if (req.user.role === 'client' && req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const waitlistEntries = await db.all(`
      SELECT 
        w.*,
        c.name as class_name,
        c.date,
        c.time,
        c.capacity,
        c.enrolled,
        c.room,
        u.name as instructor_name
      FROM waitlist w
      JOIN classes c ON w.class_id = c.id
      LEFT JOIN users u ON c.instructor_id = u.id
      WHERE w.user_id = ?
      ORDER BY c.date, c.time
    `, [userId]);

    res.json({
      success: true,
      data: waitlistEntries
    });

  } catch (error) {
    console.error('Get waitlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/bookings/waitlist/class/:classId - Get waitlist for a specific class
router.get('/waitlist/class/:classId', authenticateToken, requireAdminOrReception, async (req, res) => {
  try {
    const classId = parseInt(req.params.classId);

    const waitlistEntries = await db.all(`
      SELECT 
        w.*,
        u.name as user_name,
        u.email as user_email
      FROM waitlist w
      JOIN users u ON w.user_id = u.id
      WHERE w.class_id = ?
      ORDER BY w.position
    `, [classId]);

    res.json({
      success: true,
      data: waitlistEntries
    });

  } catch (error) {
    console.error('Get class waitlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// DELETE /api/bookings/waitlist/:waitlistId - Remove from waitlist
router.delete('/waitlist/:waitlistId', authenticateToken, async (req, res) => {
  try {
    const waitlistId = parseInt(req.params.waitlistId);

    const waitlistEntry = await db.get(
      'SELECT * FROM waitlist WHERE id = ?',
      [waitlistId]
    );

    if (!waitlistEntry) {
      return res.status(404).json({
        success: false,
        message: 'Waitlist entry not found'
      });
    }

    // Check permissions
    if (req.user.role === 'client' && req.user.id !== waitlistEntry.user_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await db.run('BEGIN TRANSACTION');

    try {
      // Remove from waitlist
      await db.run('DELETE FROM waitlist WHERE id = ?', [waitlistId]);
      
      // Update positions for remaining waitlist entries
      await db.run(
        'UPDATE waitlist SET position = position - 1 WHERE class_id = ? AND position > ?',
        [waitlistEntry.class_id, waitlistEntry.position]
      );

      await db.run('COMMIT');

      res.json({
        success: true,
        message: 'Removed from waitlist successfully'
      });

    } catch (transactionError) {
      await db.run('ROLLBACK');
      throw transactionError;
    }

  } catch (error) {
    console.error('Remove from waitlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/bookings/reception-assign - Reception assigns client to class
router.post('/reception-assign', authenticateToken, requireAdminOrReception, [
  body('userId').isInt({ min: 1 }).withMessage('Valid user ID is required'),
  body('classId').isInt({ min: 1 }).withMessage('Valid class ID is required'),
  body('notes').optional().isString().withMessage('Notes must be string'),
  body('overrideRestrictions').optional().isBoolean().withMessage('Override restrictions must be boolean')
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

    const { userId, classId, notes = '', overrideRestrictions = false } = req.body;

    // Get class details
    const class_ = await db.get('SELECT * FROM classes WHERE id = ? AND status = "active"', [classId]);
    if (!class_) {
      return res.status(404).json({
        success: false,
        message: 'Class not found or not available'
      });
    }

    // Get user details
    const user = await db.get('SELECT * FROM users WHERE id = ? AND role = "client"', [userId]);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Check if class is in the future
    const classDateTime = moment(`${class_.date} ${class_.time}`);
    if (classDateTime.isBefore(moment())) {
      return res.status(400).json({
        success: false,
        message: 'Cannot assign to past classes'
      });
    }

    // Check if user already has a booking for this class
    const existingBooking = await db.get(
      'SELECT id FROM bookings WHERE user_id = ? AND class_id = ? AND status IN ("confirmed", "waitlist")',
      [userId, classId]
    );

    if (existingBooking) {
      return res.status(400).json({
        success: false,
        message: 'Client already has a booking for this class'
      });
    }

    // Get user's subscription (if any)
    let subscription = await db.get(`
      SELECT us.*, sp.equipment_access, sp.category
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.user_id = ? 
        AND (us.status = 'active' OR (us.status = 'cancelled' AND us.remaining_classes > 0))
        AND DATE(us.end_date) >= DATE('now')
      ORDER BY us.created_at DESC
      LIMIT 1
    `, [userId]);

    // If not overriding restrictions, check subscription requirements
    if (!overrideRestrictions) {
      if (!subscription) {
        return res.status(400).json({
          success: false,
          message: 'Client needs an active subscription plan to book classes. Use override to bypass this restriction.'
        });
      }

      // Check if subscription has remaining classes
      if (subscription.remaining_classes <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Client has no remaining classes in their subscription. Use override to bypass this restriction.'
        });
      }

      // Check personal subscription restrictions
      const isPersonalSubscription = subscription.category === 'personal';
      const isPersonalClass = class_.category === 'personal';

      if (isPersonalSubscription && !isPersonalClass) {
        return res.status(400).json({
          success: false,
          message: 'Client\'s personal subscription only allows booking personal/private classes. Use override to bypass this restriction.'
        });
      }

      if (!isPersonalSubscription && isPersonalClass) {
        return res.status(400).json({
          success: false,
          message: 'This is a personal training session. Client needs a personal subscription. Use override to bypass this restriction.'
        });
      }

      // Check equipment access
      const canAccess = 
        subscription.equipment_access === 'both' || 
        subscription.equipment_access === class_.equipment_type ||
        (subscription.equipment_access === 'mat' && class_.equipment_type === 'mat') ||
        (subscription.equipment_access === 'reformer' && class_.equipment_type === 'reformer');

      if (!canAccess) {
        return res.status(400).json({
          success: false,
          message: `Client's subscription doesn't include access to ${class_.equipment_type} classes. Use override to bypass this restriction.`
        });
      }
    }

    // Check class capacity
    const currentEnrollment = await db.get(
      'SELECT COUNT(*) as count FROM bookings WHERE class_id = ? AND status = "confirmed"',
      [classId]
    );

    if (currentEnrollment.count >= class_.capacity) {
      // Add to waitlist
      const waitlistPosition = await db.get(
        'SELECT COUNT(*) + 1 as position FROM waitlist WHERE class_id = ?',
        [classId]
      );

      await db.run(
        'INSERT INTO waitlist (user_id, class_id, position) VALUES (?, ?, ?)',
        [userId, classId, waitlistPosition.position]
      );

      // Log activity
      await db.run(`
        INSERT INTO client_activity_log (
          client_id, activity_type, description, performed_by, created_at
        ) VALUES (?, ?, ?, ?, datetime('now'))
      `, [
        userId,
        'waitlist_joined',
        `Added to waitlist for "${class_.name}" on ${class_.date} at ${class_.time} by ${req.user.name} (${req.user.role}). Position: #${waitlistPosition.position}. ${notes}`.trim(),
        req.user.id
      ]);

      return res.status(202).json({
        success: true,
        message: `Class is full. Client has been added to the waitlist at position #${waitlistPosition.position}.`,
        data: { 
          waitlisted: true, 
          position: waitlistPosition.position 
        }
      });
    }

    // Start transaction
    await db.run('BEGIN TRANSACTION');

    try {
      // Create booking
      const bookingResult = await db.run(`
        INSERT INTO bookings (user_id, class_id, subscription_id, status)
        VALUES (?, ?, ?, ?)
      `, [userId, classId, subscription?.id || null, 'confirmed']);

      // Decrease remaining classes in subscription if exists
      if (subscription && subscription.remaining_classes > 0) {
        await db.run(
          'UPDATE user_subscriptions SET remaining_classes = remaining_classes - 1 WHERE id = ?',
          [subscription.id]
        );
      }

      // Update class enrollment count
      await db.run(
        'UPDATE classes SET enrolled = enrolled + 1 WHERE id = ?',
        [classId]
      );

              // Log activity
        await db.run(`
          INSERT INTO client_activity_log (
            client_id, activity_type, description, performed_by, created_at
          ) VALUES (?, ?, ?, ?, datetime('now'))
        `, [
          userId,
          'class_booking',
          `Assigned to "${class_.name}" on ${class_.date} at ${class_.time} by ${req.user.name} (${req.user.role}). ${overrideRestrictions ? 'Restrictions overridden. ' : ''}${notes}`.trim(),
          req.user.id
        ]);

      // Commit transaction
      await db.run('COMMIT');

      // Get the created booking with all details
      const newBooking = await db.get(`
        SELECT 
          b.*,
          c.name as class_name,
          c.date as class_date,
          c.time as class_time,
          c.level as class_level,
          c.equipment_type,
          c.room,
          u.name as user_name,
          u.email as user_email
        FROM bookings b
        JOIN classes c ON b.class_id = c.id
        JOIN users u ON b.user_id = u.id
        WHERE b.id = ?
      `, [bookingResult.id]);

      // Schedule reminder notification for this booking
      try {
        // Get user notification settings first (this is the priority)
        const userSettings = await db.get(`
          SELECT * FROM notification_settings WHERE user_id = ?
        `, [userId]);
        
        const userEnableNotifications = userSettings?.enable_notifications !== 0;
        const userReminderMinutes = userSettings?.default_reminder_minutes || 15;
        
        if (userEnableNotifications) {
          // Get class notification settings as fallback
          const classSettings = await db.get(`
            SELECT * FROM class_notification_settings WHERE class_id = ?
          `, [classId]);
          
          const classEnableNotifications = classSettings?.enable_notifications !== 0;
          
          // Only schedule if both user and class have notifications enabled
          if (classEnableNotifications) {
            const classTime = moment(`${class_.date} ${class_.time}`);
            const notificationTime = classTime.subtract(userReminderMinutes, 'minutes');
            
            if (notificationTime.isAfter(moment())) {
              await db.run(`
                INSERT INTO notifications (class_id, user_id, type, message, scheduled_time)
                VALUES (?, ?, 'reminder', ?, ?)
              `, [
                classId,
                userId,
                `Reminder: You have "${class_.name}" in ${userReminderMinutes} minutes`,
                notificationTime.toISOString()
              ]);
              
              console.log(`📅 Scheduled reminder notification for user ${userId} - class "${class_.name}" (${userReminderMinutes} minutes before - using user's personal settings)`);
            }
          }
        }
      } catch (notificationError) {
        console.error('Error scheduling notification:', notificationError);
      }

      console.log(`📋 Reception assigned ${user.name} to class "${class_.name}" on ${class_.date} at ${class_.time}`);

      res.json({
        success: true,
        message: `Successfully assigned ${user.name} to "${class_.name}"`,
        data: newBooking
      });

    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Reception assign booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/bookings/reception-cancel - Reception cancels client's booking
router.post('/reception-cancel', authenticateToken, requireAdminOrReception, [
  body('userId').isInt({ min: 1 }).withMessage('Valid user ID is required'),
  body('classId').isInt({ min: 1 }).withMessage('Valid class ID is required'),
  body('notes').optional().isString().withMessage('Notes must be string')
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

    const { userId, classId, notes = '' } = req.body;

    // Get class details
    const class_ = await db.get('SELECT * FROM classes WHERE id = ? AND status = "active"', [classId]);
    if (!class_) {
      return res.status(404).json({
        success: false,
        message: 'Class not found or not available'
      });
    }

    // Get user details
    const user = await db.get('SELECT * FROM users WHERE id = ? AND role = "client"', [userId]);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Check if user has a booking for this class
    const booking = await db.get(
      'SELECT * FROM bookings WHERE user_id = ? AND class_id = ? AND status = "confirmed"',
      [userId, classId]
    );

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Client does not have a confirmed booking for this class'
      });
    }

    // Start transaction
    await db.run('BEGIN TRANSACTION');

    try {
      // Cancel the booking
      await db.run(
        'UPDATE bookings SET status = "cancelled", updated_at = datetime("now") WHERE id = ?',
        [booking.id]
      );

      // Decrease class enrollment count
      await db.run(
        'UPDATE classes SET enrolled = enrolled - 1 WHERE id = ?',
        [classId]
      );

      // Refund the class to the subscription if it exists
      if (booking.subscription_id) {
        await db.run(
          'UPDATE user_subscriptions SET remaining_classes = remaining_classes + 1 WHERE id = ?',
          [booking.subscription_id]
        );
      }

      // Check if there are people on waitlist for this class
      const waitlistEntry = await db.get(
        'SELECT * FROM waitlist WHERE class_id = ? ORDER BY position LIMIT 1',
        [classId]
      );

      if (waitlistEntry) {
        // Get the next person in waitlist
        const nextInLine = await db.get(
          'SELECT w.*, u.name as user_name, u.email as user_email FROM waitlist w JOIN users u ON w.user_id = u.id WHERE w.class_id = ? ORDER BY w.position LIMIT 1',
          [classId]
        );

        if (nextInLine) {
          // Check if they have a valid subscription
          let userSubscription = await db.get(`
            SELECT us.* FROM user_subscriptions us
            WHERE us.user_id = ? AND us.status = 'active'
            ORDER BY us.created_at DESC LIMIT 1
          `, [nextInLine.user_id]);

          // If no active subscription, check for cancelled with remaining classes
          if (!userSubscription) {
            userSubscription = await db.get(`
              SELECT us.* FROM user_subscriptions us
              WHERE us.user_id = ? 
                AND us.status = 'cancelled' 
                AND us.remaining_classes > 0
                AND DATE(us.end_date) >= DATE('now')
              ORDER BY us.created_at DESC LIMIT 1
            `, [nextInLine.user_id]);
          }

          if (userSubscription && (userSubscription.remaining_classes > 0 || userSubscription.plan_type === 'unlimited')) {
            // Create booking for waitlisted user
            await db.run(`
              INSERT INTO bookings (user_id, class_id, subscription_id, status)
              VALUES (?, ?, ?, ?)
            `, [nextInLine.user_id, classId, userSubscription.id, 'confirmed']);

            // Update subscription
            if (userSubscription.plan_type !== 'unlimited') {
              await db.run(
                'UPDATE user_subscriptions SET remaining_classes = remaining_classes - 1 WHERE id = ?',
                [userSubscription.id]
              );
            }

            // Update class enrollment back to full
            await db.run(
              'UPDATE classes SET enrolled = enrolled + 1 WHERE id = ?',
              [classId]
            );

            // Remove from waitlist
            await db.run('DELETE FROM waitlist WHERE id = ?', [nextInLine.id]);
            
            // Update other waitlist positions
            await db.run(
              'UPDATE waitlist SET position = position - 1 WHERE class_id = ? AND position > ?',
              [classId, nextInLine.position]
            );

            // Schedule notification for the promoted user
            const notificationTime = new Date().toISOString();
            const classDate = new Date(class_.date).toLocaleDateString();
            const message = `🎉 Great news! A spot opened up in "${class_.name}" on ${classDate} at ${class_.time}. You are now booked automatically!`;
            
            await db.run(`
              INSERT INTO notifications (class_id, user_id, type, message, scheduled_time)
              VALUES (?, ?, 'waitlist_promotion', ?, ?)
            `, [classId, nextInLine.user_id, message, notificationTime]);

            console.log(`📋 Promoted ${nextInLine.user_name} from waitlist for class "${class_.name}"`);
          }
        }
      }

      // Log activity
      await db.run(`
        INSERT INTO client_activity_log (
          client_id, activity_type, description, performed_by, created_at
        ) VALUES (?, ?, ?, ?, datetime('now'))
      `, [
        userId,
        'class_cancellation',
        `Booking cancelled for "${class_.name}" on ${class_.date} at ${class_.time} by ${req.user.name} (${req.user.role}). ${notes}`.trim(),
        req.user.id
      ]);

      // Commit transaction
      await db.run('COMMIT');

      console.log(`📋 Reception cancelled ${user.name}'s booking for class "${class_.name}" on ${class_.date} at ${class_.time}`);

      res.json({
        success: true,
        message: `Successfully cancelled ${user.name}'s booking for "${class_.name}"`,
        data: {
          bookingId: booking.id,
          classId: classId,
          userId: userId
        }
      });

    } catch (error) {
      await db.run('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Reception cancel booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router; 