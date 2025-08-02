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
    
    if (db.useSupabase) {
      // Use Supabase REST API with joins
      let queryUrl = `${process.env.SUPABASE_URL}/rest/v1/bookings?select=*,classes(*,instructor:users!classes_instructor_id_fkey(name)),user:users!bookings_user_id_fkey(name,email)`;
      
      const queryParams = [];
      
      // If user is not admin/instructor, only show their own bookings
      if (req.user.role === 'client') {
        queryParams.push(`user_id=eq.${req.user.id}`);
      } else if (userId && (req.user.role === 'admin' || req.user.role === 'reception')) {
        queryParams.push(`user_id=eq.${userId}`);
      }

      if (classId) {
        queryParams.push(`class_id=eq.${classId}`);
      }

      if (status) {
        queryParams.push(`status=eq.${status}`);
      }

      if (date) {
        queryParams.push(`classes.date=eq.${date}`);
      }
      
      if (queryParams.length > 0) {
        queryUrl += '&' + queryParams.join('&');
      }
      
      queryUrl += '&order=classes(date).desc,classes(time).desc';
      
      const response = await fetch(queryUrl, {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const bookings = await response.json();
        
        // Format the response to match the expected structure
        const formattedBookings = (bookings || []).map(booking => ({
          ...booking,
          class_name: booking.classes?.name,
          class_date: booking.classes?.date,
          class_time: booking.classes?.time,
          class_level: booking.classes?.level,
          equipment_type: booking.classes?.equipment_type,
          room: booking.classes?.room,
          user_name: booking.user?.name,
          user_email: booking.user?.email,
          instructor_name: booking.classes?.instructor?.name
        }));
        
        res.json({
          success: true,
          data: formattedBookings
        });
      } else {
        const errorText = await response.text();
        console.error('❌ Supabase bookings API failed:', response.status, errorText);
        res.json({
          success: true,
          data: [] // Return empty array on error
        });
      }
    } else {
      // SQLite implementation
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
    }

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
  body('classId').notEmpty().withMessage('Valid class ID is required')
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
            // Check if the user already has a booking for this class to prevent duplicates
            const existingBookingResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/bookings?user_id=eq.${nextInLine.user_id}&class_id=eq.${booking.class_id}&status=eq.confirmed&select=id`, {
              headers: {
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
                'Content-Type': 'application/json'
              }
            });
            
            const existingBookings = existingBookingResponse.ok ? await existingBookingResponse.json() : [];
            const existingBooking = existingBookings.length > 0 ? existingBookings[0] : null;
            
            if (existingBooking) {
              console.log(`⚠️ User ${nextInLine.user_name} already has a booking for class ${booking.class_id}, removing from waitlist without creating duplicate booking`);
              
              // Remove the user from waitlist since they already have a booking
              await fetch(`${process.env.SUPABASE_URL}/rest/v1/waitlist?id=eq.${nextInLine.id}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                  'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
                  'Content-Type': 'application/json'
                }
              });
              
              // Update positions for remaining waitlist entries - decrease by 1
              const waitlistUpdateResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/waitlist?class_id=eq.${booking.class_id}&position=gt.${nextInLine.position}`, {
                method: 'PATCH',
                headers: {
                  'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                  'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
                  'Content-Type': 'application/json',
                  'Prefer': 'return=minimal'
                },
                body: JSON.stringify({
                  position: 'raw(position - 1)'
                })
              });
              
              if (!waitlistUpdateResponse.ok) {
                console.warn('Failed to update waitlist positions after duplicate removal');
              }
              
              console.log(`🔄 Removed duplicate user from waitlist, skipping to next person`);
            } else {
              // Create booking for waitlisted user
              await fetch(`${process.env.SUPABASE_URL}/rest/v1/bookings`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                  'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  user_id: nextInLine.user_id,
                  class_id: booking.class_id,
                  subscription_id: userSubscription.id,
                  status: 'confirmed',
                  booking_date: new Date().toISOString()
                })
              });

              // Update subscription
              if (userSubscription.plan_type !== 'unlimited') {
                await fetch(`${process.env.SUPABASE_URL}/rest/v1/user_subscriptions?id=eq.${userSubscription.id}`, {
                  method: 'PATCH',
                  headers: {
                    'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                    'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    remaining_classes: userSubscription.remaining_classes - 1
                  })
                });
              }

              // Update class enrollment back to full
              await fetch(`${process.env.SUPABASE_URL}/rest/v1/classes?id=eq.${booking.class_id}`, {
                method: 'PATCH',
                headers: {
                  'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                  'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  enrolled: booking.enrolled + 1
                })
              });

              // Remove from waitlist
              await fetch(`${process.env.SUPABASE_URL}/rest/v1/waitlist?id=eq.${nextInLine.id}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                  'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
                  'Content-Type': 'application/json'
                }
              });
              
              // Update other waitlist positions  
              await fetch(`${process.env.SUPABASE_URL}/rest/v1/waitlist?class_id=eq.${booking.class_id}&position=gt.${nextInLine.position}`, {
                method: 'PATCH',
                headers: {
                  'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                  'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
                  'Content-Type': 'application/json',
                  'Prefer': 'return=minimal'
                },
                body: JSON.stringify({
                  position: 'raw(position - 1)'
                })
              });

              // Schedule notification for the promoted user
              const notificationTime = new Date().toISOString();
              const classDate = new Date(booking.date).toLocaleDateString();
              const message = `🎉 Great news! A spot opened up in "${booking.class_name}" on ${classDate} at ${booking.time}. You are now booked automatically!`;
              
              await fetch(`${process.env.SUPABASE_URL}/rest/v1/notifications`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                  'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  class_id: booking.class_id,
                  user_id: nextInLine.user_id,
                  type: 'waitlist_promotion',
                  message: message,
                  scheduled_time: notificationTime
                })
              });

              console.log(`📋 Promoted ${nextInLine.user_name} from waitlist for class "${booking.class_name}"`);
            }
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
  body('classId').notEmpty().withMessage('Valid class ID is required')
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
    
    if (db.useSupabase) {
      // Use Supabase REST API with joins
      let queryUrl = `${process.env.SUPABASE_URL}/rest/v1/bookings?user_id=eq.${userId}&select=*,classes(*,instructor:users!classes_instructor_id_fkey(name))`;
      
      const queryParams = [];
      
      if (status) {
        queryParams.push(`status=eq.${status}`);
      }

      if (startDate) {
        queryParams.push(`classes.date=gte.${startDate}`);
      }

      if (endDate) {
        queryParams.push(`classes.date=lte.${endDate}`);
      }
      
      if (queryParams.length > 0) {
        queryUrl += '&' + queryParams.join('&');
      }
      
      queryUrl += '&order=classes(date).desc,classes(time).desc';
      
      const response = await fetch(queryUrl, {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const bookings = await response.json();
        
        // Format the response to match the expected structure
        const formattedBookings = (bookings || []).map(booking => ({
          ...booking,
          class_name: booking.classes?.name,
          class_date: booking.classes?.date,
          class_time: booking.classes?.time,
          class_level: booking.classes?.level,
          equipment_type: booking.classes?.equipment_type,
          room: booking.classes?.room,
          instructor_name: booking.classes?.instructor?.name
        }));
        
        res.json({
          success: true,
          data: formattedBookings
        });
      } else {
        const errorText = await response.text();
        console.error('❌ Supabase error response (GET user bookings):', errorText);
        res.status(500).json({
          success: false,
          message: 'Failed to fetch user bookings'
        });
      }
    } else {
      // SQLite implementation
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
    }

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
    
    // Get total bookings using Supabase REST API
    const totalBookingsResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/bookings?user_id=eq.${userId}&select=id`, {
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    if (!totalBookingsResponse.ok) {
      throw new Error('Failed to fetch total bookings');
    }
    
    const totalBookings = await totalBookingsResponse.json();
    const totalCount = totalBookings.length;

    // Get bookings by status using Supabase REST API
    const statusBreakdownResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/bookings?user_id=eq.${userId}&select=status`, {
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    if (!statusBreakdownResponse.ok) {
      throw new Error('Failed to fetch status breakdown');
    }
    
    const statusBreakdownData = await statusBreakdownResponse.json();
    
    // Process status breakdown
    const statusBreakdown = {};
    let attendedBookings = 0;
    
    statusBreakdownData.forEach(booking => {
      const status = booking.status;
      statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
      if (status === 'confirmed' || status === 'completed') {
        attendedBookings++;
      }
    });

    const attendanceRate = totalCount > 0 
      ? Math.round((attendedBookings / totalCount) * 100)
      : 0;

    // Get favorite instructor using Supabase REST API with joins
    const favoriteInstructorResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/bookings?user_id=eq.${userId}&status=in.confirmed,completed&select=classes(instructor_id),classes(users(name))`, {
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    let favoriteInstructor = null;
    if (favoriteInstructorResponse.ok) {
      const favoriteInstructorData = await favoriteInstructorResponse.json();
      // Process instructor data to find most frequent
      const instructorCounts = {};
      favoriteInstructorData.forEach(booking => {
        if (booking.classes && booking.classes.users) {
          const instructorName = booking.classes.users.name;
          instructorCounts[instructorName] = (instructorCounts[instructorName] || 0) + 1;
        }
      });
      
      const sortedInstructors = Object.entries(instructorCounts)
        .sort(([,a], [,b]) => b - a);
      
      favoriteInstructor = sortedInstructors.length > 0 ? sortedInstructors[0][0] : null;
    }

    // Get last activity using Supabase REST API
    const lastActivityResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/bookings?user_id=eq.${userId}&select=created_at,classes(date,time,name)&order=created_at.desc&limit=1`, {
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    let lastActivity = null;
    if (lastActivityResponse.ok) {
      const lastActivityData = await lastActivityResponse.json();
      if (lastActivityData.length > 0 && lastActivityData[0].classes) {
        const activity = lastActivityData[0].classes;
        lastActivity = {
          date: activity.date,
          time: activity.time,
          className: activity.name
        };
      }
    }

    res.json({
      success: true,
      data: {
        totalBookings: totalCount,
        statusBreakdown,
        attendanceRate,
        favoriteInstructor,
        lastActivity
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
  // Accept UUIDs for Supabase
  body('userId').custom((value) => {
    // Accept integer (SQLite) or UUID string (Supabase)
    if (Number.isInteger(Number(value)) && Number(value) > 0) return true;
    if (typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) return true;
    throw new Error('Valid user ID is required');
  }),
  body('classId').custom((value) => {
    if (Number.isInteger(Number(value)) && Number(value) > 0) return true;
    if (typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) return true;
    throw new Error('Valid class ID is required');
  }),
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

    console.log('🔍 reception-assign: classId:', classId);
    
    // Get class details using Supabase REST API
    let class_ = null;
    if (db.useSupabase) {
      const classResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/classes?id=eq.${classId}&status=eq.active&select=*`, {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        }
      });
      
      if (classResponse.ok) {
        const classes = await classResponse.json();
        class_ = classes.length > 0 ? classes[0] : null;
      }
    } else {
      class_ = await db.get('SELECT * FROM classes WHERE id = ? AND status = "active"', [classId]);
    }
    
    console.log('🔍 reception-assign: class_ result:', class_);
    if (!class_) {
      return res.status(404).json({
        success: false,
        message: 'Class not found or not available'
      });
    }

    // Get user details using Supabase REST API
    let user = null;
    if (db.useSupabase) {
      const userResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/users?id=eq.${userId}&role=eq.client&select=*`, {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        }
      });
      
      if (userResponse.ok) {
        const users = await userResponse.json();
        user = users.length > 0 ? users[0] : null;
      }
    } else {
      user = await db.get('SELECT * FROM users WHERE id = ? AND role = "client"', [userId]);
    }
    
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
    let existingBooking = null;
    if (db.useSupabase) {
      const bookingResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/bookings?user_id=eq.${userId}&class_id=eq.${classId}&status=in.(confirmed,waitlist)&select=id`, {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        }
      });
      
      if (bookingResponse.ok) {
        const bookings = await bookingResponse.json();
        existingBooking = bookings.length > 0 ? bookings[0] : null;
      }
    } else {
      existingBooking = await db.get(
        'SELECT id FROM bookings WHERE user_id = ? AND class_id = ? AND status IN ("confirmed", "waitlist")',
        [userId, classId]
      );
    }

    if (existingBooking) {
      return res.status(400).json({
        success: false,
        message: 'Client already has a booking for this class'
      });
    }

    // Get user's subscription (if any)
    let subscription = null;
    if (db.useSupabase) {
      // For Supabase, we need to get subscription with plan details
      const subscriptionResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/user_subscriptions?user_id=eq.${userId}&or=(status.eq.active,and(status.eq.cancelled,remaining_classes.gt.0))&end_date=gte.${new Date().toISOString().split('T')[0]}&select=*,subscription_plans(equipment_access,category)&order=created_at.desc&limit=1`, {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        }
      });
      
      if (subscriptionResponse.ok) {
        const subscriptions = await subscriptionResponse.json();
        if (subscriptions.length > 0) {
          subscription = {
            ...subscriptions[0],
            equipment_access: subscriptions[0].subscription_plans?.equipment_access,
            category: subscriptions[0].subscription_plans?.category
          };
        }
      }
    } else {
      subscription = await db.get(`
        SELECT us.*, sp.equipment_access, sp.category
        FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.id
        WHERE us.user_id = ? 
          AND (us.status = 'active' OR (us.status = 'cancelled' AND us.remaining_classes > 0))
          AND DATE(us.end_date) >= DATE('now')
        ORDER BY us.created_at DESC
        LIMIT 1
      `, [userId]);
    }

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
    let currentEnrollment = { count: 0 };
    if (db.useSupabase) {
      const enrollmentResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/bookings?class_id=eq.${classId}&status=eq.confirmed&select=id`, {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        }
      });
      
      if (enrollmentResponse.ok) {
        const bookings = await enrollmentResponse.json();
        currentEnrollment = { count: bookings.length };
      }
    } else {
      currentEnrollment = await db.get(
        'SELECT COUNT(*) as count FROM bookings WHERE class_id = ? AND status = "confirmed"',
        [classId]
      );
    }

    if (currentEnrollment.count >= class_.capacity) {
      // Add to waitlist
      let waitlistPosition = { position: 1 };
      if (db.useSupabase) {
        const waitlistCountResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/waitlist?class_id=eq.${classId}&select=id`, {
          headers: {
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json'
          }
        });
        
        if (waitlistCountResponse.ok) {
          const waitlistEntries = await waitlistCountResponse.json();
          waitlistPosition = { position: waitlistEntries.length + 1 };
        }

        // Insert into waitlist
        await fetch(`${process.env.SUPABASE_URL}/rest/v1/waitlist`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            user_id: userId,
            class_id: classId,
            position: waitlistPosition.position
          })
        });

        // Log activity
        await fetch(`${process.env.SUPABASE_URL}/rest/v1/client_activity_log`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            client_id: userId,
            activity_type: 'waitlist_joined',
            description: `Added to waitlist for "${class_.name}" on ${class_.date} at ${class_.time} by ${req.user.name} (${req.user.role}). Position: #${waitlistPosition.position}. ${notes}`.trim(),
            performed_by: req.user.id,
            created_at: new Date().toISOString()
          })
        });
      } else {
        waitlistPosition = await db.get(
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
      }

      return res.status(202).json({
        success: true,
        message: `Class is full. Client has been added to the waitlist at position #${waitlistPosition.position}.`,
        data: { 
          waitlisted: true, 
          position: waitlistPosition.position 
        }
      });
    }

    // Create booking (transactions handled differently for Supabase)
    let bookingResult = null;
    
    if (db.useSupabase) {
      // Create booking
      const bookingResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/bookings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          user_id: userId,
          class_id: classId,
          subscription_id: subscription?.id || null,
          status: 'confirmed'
        })
      });

      if (bookingResponse.ok) {
        const bookings = await bookingResponse.json();
        bookingResult = { id: bookings[0]?.id };

        // Decrease remaining classes in subscription if exists
        if (subscription && subscription.remaining_classes > 0) {
          await fetch(`${process.env.SUPABASE_URL}/rest/v1/user_subscriptions?id=eq.${subscription.id}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
              'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              remaining_classes: subscription.remaining_classes - 1
            })
          });
        }

        // Update class enrollment count
        await fetch(`${process.env.SUPABASE_URL}/rest/v1/classes?id=eq.${classId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            enrolled: (class_.enrolled || 0) + 1
          })
        });

        // Log activity
        await fetch(`${process.env.SUPABASE_URL}/rest/v1/client_activity_log`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            client_id: userId,
            activity_type: 'class_booking',
            description: `Assigned to "${class_.name}" on ${class_.date} at ${class_.time} by ${req.user.name} (${req.user.role}). ${overrideRestrictions ? 'Restrictions overridden. ' : ''}${notes}`.trim(),
            performed_by: req.user.id,
            created_at: new Date().toISOString()
          })
        });
      } else {
        throw new Error('Failed to create booking');
      }
    } else {
      // SQLite transaction
      await db.run('BEGIN TRANSACTION');

      try {
        // Create booking
        bookingResult = await db.run(`
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
      } catch (error) {
        await db.run('ROLLBACK');
        throw error;
      }
    }

    // Get the created booking with all details
    let newBooking = null;
    if (db.useSupabase) {
      // For Supabase, we can construct the booking from existing data
      newBooking = {
        id: bookingResult.id,
        user_id: userId,
        class_id: classId,
        subscription_id: subscription?.id || null,
        status: 'confirmed',
        class_name: class_.name,
        class_date: class_.date,
        class_time: class_.time,
        class_level: class_.level,
        equipment_type: class_.equipment_type,
        room: class_.room,
        user_name: user.name,
        user_email: user.email
      };
    } else {
      newBooking = await db.get(`
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
    }

    // Schedule reminder notification for this booking (simplified for Supabase)
    try {
      if (!db.useSupabase) {
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
    console.error('Reception assign booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/bookings/reception-cancel - Reception cancels client's booking
router.post('/reception-cancel', authenticateToken, requireAdminOrReception, [
  body('userId').isString().withMessage('Valid user ID is required'),
  body('classId').isString().withMessage('Valid class ID is required'),
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

    console.log('🔍 reception-cancel: classId:', classId, 'userId:', userId);

    // Get class details
    let class_ = null;
    if (db.useSupabase) {
      const classResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/classes?id=eq.${classId}&status=eq.active&select=*`, {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        }
      });
      if (classResponse.ok) {
        const classes = await classResponse.json();
        class_ = classes.length > 0 ? classes[0] : null;
      }
    } else {
      class_ = await db.get('SELECT * FROM classes WHERE id = ? AND status = "active"', [classId]);
    }

    if (!class_) {
      return res.status(404).json({
        success: false,
        message: 'Class not found or not available'
      });
    }

    // Get user details
    let user = null;
    if (db.useSupabase) {
      const userResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/users?id=eq.${userId}&role=eq.client&select=*`, {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        }
      });
      if (userResponse.ok) {
        const users = await userResponse.json();
        user = users.length > 0 ? users[0] : null;
      }
    } else {
      user = await db.get('SELECT * FROM users WHERE id = ? AND role = "client"', [userId]);
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Check if user has a booking for this class
    let booking = null;
    if (db.useSupabase) {
      const bookingResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/bookings?user_id=eq.${userId}&class_id=eq.${classId}&status=eq.confirmed&select=*`, {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        }
      });
      if (bookingResponse.ok) {
        const bookings = await bookingResponse.json();
        booking = bookings.length > 0 ? bookings[0] : null;
      }
    } else {
      booking = await db.get(
        'SELECT * FROM bookings WHERE user_id = ? AND class_id = ? AND status = "confirmed"',
        [userId, classId]
      );
    }

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Client does not have a confirmed booking for this class'
      });
    }

    try {
      // Delete the booking completely
      if (db.useSupabase) {
        const deleteBookingResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/bookings?id=eq.${booking.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json'
          }
        });
        if (!deleteBookingResponse.ok) {
          throw new Error('Failed to delete booking');
        }
      } else {
        await db.run('DELETE FROM bookings WHERE id = ?', [booking.id]);
      }

      // Decrease class enrollment count
      if (db.useSupabase) {
        const updateClassResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/classes?id=eq.${classId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            enrolled: class_.enrolled - 1
          })
        });
        if (!updateClassResponse.ok) {
          throw new Error('Failed to update class enrollment');
        }
      } else {
        await db.run(
          'UPDATE classes SET enrolled = enrolled - 1 WHERE id = ?',
          [classId]
        );
      }

      // Refund the class to the subscription if it exists
      if (booking.subscription_id) {
        if (db.useSupabase) {
          const subscriptionResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/user_subscriptions?id=eq.${booking.subscription_id}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
              'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              remaining_classes: booking.remaining_classes + 1
            })
          });
          if (!subscriptionResponse.ok) {
            console.warn('Failed to update subscription remaining classes');
          }
        } else {
          await db.run(
            'UPDATE user_subscriptions SET remaining_classes = remaining_classes + 1 WHERE id = ?',
            [booking.subscription_id]
          );
        }
      }

      // Check if there are people on waitlist for this class
      let waitlistEntry = null;
      if (db.useSupabase) {
        const waitlistResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/waitlist?class_id=eq.${classId}&order=position.asc&limit=1&select=*`, {
          headers: {
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json'
          }
        });
        if (waitlistResponse.ok) {
          const waitlistEntries = await waitlistResponse.json();
          waitlistEntry = waitlistEntries.length > 0 ? waitlistEntries[0] : null;
        }
      } else {
        waitlistEntry = await db.get(
          'SELECT * FROM waitlist WHERE class_id = ? ORDER BY position LIMIT 1',
          [classId]
        );
      }

      if (waitlistEntry) {
        // Get the next person in waitlist with user details
        let nextInLine = null;
        if (db.useSupabase) {
          const nextInLineResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/waitlist?class_id=eq.${classId}&order=position.asc&limit=1&select=*,users(name,email)`, {
            headers: {
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
              'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
              'Content-Type': 'application/json'
            }
          });
          if (nextInLineResponse.ok) {
            const waitlistEntries = await nextInLineResponse.json();
            nextInLine = waitlistEntries.length > 0 ? waitlistEntries[0] : null;
          }
        } else {
          nextInLine = await db.get(
            'SELECT w.*, u.name as user_name, u.email as user_email FROM waitlist w JOIN users u ON w.user_id = u.id WHERE w.class_id = ? ORDER BY w.position LIMIT 1',
            [classId]
          );
        }

        if (nextInLine) {
          // Check if the user already has a booking for this class to prevent duplicates
          let existingBooking = null;
          if (db.useSupabase) {
            const existingBookingResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/bookings?user_id=eq.${nextInLine.user_id}&class_id=eq.${classId}&status=eq.confirmed&select=id`, {
              headers: {
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
                'Content-Type': 'application/json'
              }
            });
            if (existingBookingResponse.ok) {
              const existingBookings = await existingBookingResponse.json();
              existingBooking = existingBookings.length > 0 ? existingBookings[0] : null;
            }
          } else {
            existingBooking = await db.get(
              'SELECT id FROM bookings WHERE user_id = ? AND class_id = ? AND status = "confirmed"',
              [nextInLine.user_id, classId]
            );
          }
          
          if (existingBooking) {
            console.log(`⚠️ User ${nextInLine.user_name} already has a booking for class ${classId}, removing from waitlist without creating duplicate booking`);
            
            // Remove the user from waitlist since they already have a booking
            if (db.useSupabase) {
              await fetch(`${process.env.SUPABASE_URL}/rest/v1/waitlist?id=eq.${nextInLine.id}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                  'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
                  'Content-Type': 'application/json'
                }
              });
            } else {
              await db.run('DELETE FROM waitlist WHERE id = ?', [nextInLine.id]);
            }
            
            // Update positions for remaining waitlist entries
            if (db.useSupabase) {
              await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/update_waitlist_positions`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                  'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  p_class_id: classId,
                  p_removed_position: nextInLine.position
                })
              });
            } else {
              await db.run(
                'UPDATE waitlist SET position = position - 1 WHERE class_id = ? AND position > ?',
                [classId, nextInLine.position]
              );
            }
            
            console.log(`🔄 Skipped duplicate booking, will try next person in waitlist`);
            // Continue to check next person in waitlist by returning without further processing
            return res.json({
              success: true,
              message: 'Booking cancelled successfully. Waitlist user already had booking, cleaned up waitlist.',
              data: {
                cancelledAt: new Date().toISOString(),
                duplicateRemoved: true
              }
            });
          }

          // Check if they have a valid subscription
          let userSubscription = null;
          if (db.useSupabase) {
            const subscriptionResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/user_subscriptions?user_id=eq.${nextInLine.user_id}&status=eq.active&order=created_at.desc&limit=1&select=*`, {
              headers: {
                'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
                'Content-Type': 'application/json'
              }
            });
            if (subscriptionResponse.ok) {
              const subscriptions = await subscriptionResponse.json();
              userSubscription = subscriptions.length > 0 ? subscriptions[0] : null;
            }

            // If no active subscription, check for cancelled with remaining classes
            if (!userSubscription) {
              const cancelledSubscriptionResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/user_subscriptions?user_id=eq.${nextInLine.user_id}&status=eq.cancelled&remaining_classes=gt.0&order=created_at.desc&limit=1&select=*`, {
                headers: {
                  'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                  'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
                  'Content-Type': 'application/json'
                }
              });
              if (cancelledSubscriptionResponse.ok) {
                const cancelledSubscriptions = await cancelledSubscriptionResponse.json();
                userSubscription = cancelledSubscriptions.length > 0 ? cancelledSubscriptions[0] : null;
              }
            }
          } else {
            userSubscription = await db.get(`
              SELECT us.* FROM user_subscriptions us
              WHERE us.user_id = ? AND us.status = 'active'
              ORDER BY us.created_at DESC LIMIT 1
            `, [nextInLine.user_id]);

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
          }

          if (userSubscription && (userSubscription.remaining_classes > 0 || userSubscription.plan_type === 'unlimited')) {
            // Create booking for waitlisted user
            if (db.useSupabase) {
              const newBookingResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/bookings`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                  'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  user_id: nextInLine.user_id,
                  class_id: classId,
                  subscription_id: userSubscription.id,
                  status: 'confirmed'
                })
              });
              if (!newBookingResponse.ok) {
                throw new Error('Failed to create booking for waitlisted user');
              }
            } else {
              await db.run(`
                INSERT INTO bookings (user_id, class_id, subscription_id, status)
                VALUES (?, ?, ?, ?)
              `, [nextInLine.user_id, classId, userSubscription.id, 'confirmed']);
            }

            // Update subscription
            if (userSubscription.plan_type !== 'unlimited') {
              if (db.useSupabase) {
                const updateSubscriptionResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/user_subscriptions?id=eq.${userSubscription.id}`, {
                  method: 'PATCH',
                  headers: {
                    'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                    'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    remaining_classes: userSubscription.remaining_classes - 1
                  })
                });
                if (!updateSubscriptionResponse.ok) {
                  throw new Error('Failed to update subscription');
                }
              } else {
                await db.run(
                  'UPDATE user_subscriptions SET remaining_classes = remaining_classes - 1 WHERE id = ?',
                  [userSubscription.id]
                );
              }
            }

            // Update class enrollment back to full
            if (db.useSupabase) {
              const updateClassResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/classes?id=eq.${classId}`, {
                method: 'PATCH',
                headers: {
                  'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                  'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  enrolled: class_.enrolled
                })
              });
              if (!updateClassResponse.ok) {
                throw new Error('Failed to update class enrollment');
              }
            } else {
              await db.run(
                'UPDATE classes SET enrolled = enrolled + 1 WHERE id = ?',
                [classId]
              );
            }

            // Remove from waitlist
            if (db.useSupabase) {
              const deleteWaitlistResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/waitlist?id=eq.${nextInLine.id}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                  'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
                  'Content-Type': 'application/json'
                }
              });
              if (!deleteWaitlistResponse.ok) {
                throw new Error('Failed to remove from waitlist');
              }
            } else {
              await db.run('DELETE FROM waitlist WHERE id = ?', [nextInLine.id]);
            }
            
            // Update other waitlist positions
            if (db.useSupabase) {
              const updatePositionsResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/waitlist?class_id=eq.${classId}&position=gt.${nextInLine.position}`, {
                method: 'PATCH',
                headers: {
                  'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                  'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  position: nextInLine.position - 1
                })
              });
              if (!updatePositionsResponse.ok) {
                console.warn('Failed to update waitlist positions');
              }
            } else {
              await db.run(
                'UPDATE waitlist SET position = position - 1 WHERE class_id = ? AND position > ?',
                [classId, nextInLine.position]
              );
            }

            // Schedule notification for the promoted user
            const notificationTime = new Date().toISOString();
            const classDate = new Date(class_.date).toLocaleDateString();
            const message = `🎉 Great news! A spot opened up in "${class_.name}" on ${classDate} at ${class_.time}. You are now booked automatically!`;
            
            if (db.useSupabase) {
              const notificationResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/notifications`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
                  'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  class_id: classId,
                  user_id: nextInLine.user_id,
                  type: 'waitlist_promotion',
                  message: message,
                  scheduled_time: notificationTime
                })
              });
              if (!notificationResponse.ok) {
                console.warn('Failed to create notification');
              }
            } else {
              await db.run(`
                INSERT INTO notifications (class_id, user_id, type, message, scheduled_time)
                VALUES (?, ?, 'waitlist_promotion', ?, ?)
              `, [classId, nextInLine.user_id, message, notificationTime]);
            }

            console.log(`📋 Promoted ${nextInLine.users?.name || 'user'} from waitlist for class "${class_.name}"`);
          }
        }
      }

      // Log activity
      if (db.useSupabase) {
        const activityResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/client_activity_log`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            client_id: userId,
            activity_type: 'class_cancellation',
            description: `Booking removed for "${class_.name}" on ${class_.date} at ${class_.time} by ${req.user.name} (${req.user.role}). ${notes}`.trim(),
            performed_by: req.user.id
          })
        });
        if (!activityResponse.ok) {
          console.warn('Failed to log activity');
        }
      } else {
        await db.run(`
          INSERT INTO client_activity_log (
            client_id, activity_type, description, performed_by, created_at
          ) VALUES (?, ?, ?, ?, datetime('now'))
        `, [
          userId,
          'class_cancellation',
          `Booking removed for "${class_.name}" on ${class_.date} at ${class_.time} by ${req.user.name} (${req.user.role}). ${notes}`.trim(),
          req.user.id
        ]);
      }

      console.log(`📋 Reception removed ${user.name}'s booking for class "${class_.name}" on ${class_.date} at ${class_.time}`);

      res.json({
        success: true,
        message: `Successfully removed ${user.name}'s booking for "${class_.name}"`,
        data: {
          bookingId: booking.id,
          classId: classId,
          userId: userId
        }
      });

    } catch (error) {
      console.error('Reception cancel booking error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
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