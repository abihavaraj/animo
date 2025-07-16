const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, requireAdmin, requireAdminOrReception, requireInstructor } = require('../middleware/auth');

const router = express.Router();

// GET /api/classes - Get all classes (public for booking)
router.get('/', async (req, res) => {
  try {
    const { date, instructor, level, equipmentType, status } = req.query;
    
    let query = `
      SELECT 
        c.*,
        u.name as instructor_name
      FROM classes c
      JOIN users u ON c.instructor_id = u.id
      WHERE 1=1
    `;
    
    const params = [];

    if (date) {
      query += ' AND c.date = ?';
      params.push(date);
    }

    if (instructor) {
      query += ' AND c.instructor_id = ?';
      params.push(instructor);
    }

    if (level) {
      query += ' AND c.level = ?';
      params.push(level);
    }

    if (equipmentType) {
      query += ' AND c.equipment_type = ?';
      params.push(equipmentType);
    }

    if (status) {
      query += ' AND c.status = ?';
      params.push(status);
    } else {
      // By default, only show active classes
      query += ' AND c.status = "active"';
    }

    query += ' ORDER BY c.date, c.time';

    const classes = await db.all(query, params);

    // Parse equipment JSON for each class
    const formattedClasses = classes.map(class_ => ({
      ...class_,
      equipment: class_.equipment ? JSON.parse(class_.equipment) : []
    }));

    res.json({
      success: true,
      data: formattedClasses
    });

  } catch (error) {
    console.error('Get classes error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/classes/room-availability - Check room availability for a specific date and time
router.get('/room-availability', authenticateToken, requireAdminOrReception, async (req, res) => {
  try {
    const { date, time, duration } = req.query;
    
    if (!date || !time || !duration) {
      return res.status(400).json({
        success: false,
        message: 'Date, time, and duration are required'
      });
    }

    // Get all rooms
    const allRooms = ['Reformer Room', 'Mat Room', 'Cadillac Room', 'Wall Room'];
    
    // Check availability for each room
    const roomAvailability = {};
    
    for (const room of allRooms) {
      const conflict = await checkRoomConflict(date, time, parseInt(duration), room);
      roomAvailability[room] = {
        available: !conflict.hasConflict,
        conflictClass: conflict.conflictClass || null
      };
    }

    res.json({
      success: true,
      data: roomAvailability
    });

  } catch (error) {
    console.error('Room availability check error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/classes/:id - Get single class
router.get('/:id', async (req, res) => {
  try {
    const class_ = await db.get(`
      SELECT 
        c.*,
        u.name as instructor_name
      FROM classes c
      JOIN users u ON c.instructor_id = u.id
      WHERE c.id = ?
    `, [req.params.id]);

    if (!class_) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Parse equipment JSON
    class_.equipment = class_.equipment ? JSON.parse(class_.equipment) : [];

    res.json({
      success: true,
      data: class_
    });

  } catch (error) {
    console.error('Get class error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/classes - Create new class (admin only)
router.post('/', authenticateToken, requireAdminOrReception, [
  body('name').notEmpty().withMessage('Class name is required'),
  body('instructorId').isInt({ min: 1 }).withMessage('Valid instructor ID is required'),
  body('date').isISO8601().withMessage('Valid date is required'),
  body('time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid time is required (HH:MM)'),
  body('duration').isInt({ min: 15, max: 180 }).withMessage('Duration must be between 15-180 minutes'),
  body('category').isIn(['personal', 'group']).withMessage('Category must be personal or group'),
  body('capacity').isInt({ min: 1, max: 50 }).withMessage('Capacity must be between 1-50'),
  body('equipmentType').isIn(['mat', 'reformer', 'both']).withMessage('Invalid equipment type'),
  body('equipment').isArray().withMessage('Equipment must be an array'),
  body('description').optional(),
  body('room').optional().isIn(['Reformer Room', 'Mat Room', 'Cadillac Room', 'Wall Room', '']).withMessage('Invalid room selection'),
  body('level').optional().isIn(['Beginner', 'Intermediate', 'Advanced']).withMessage('Invalid level'),
  body('enableNotifications').optional().isBoolean().withMessage('Invalid enableNotifications format'),
  body('notificationMinutes').optional().isInt({ min: 1, max: 1440 }).withMessage('Notification minutes must be between 1-1440')
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
      name,
      instructorId,
      date,
      time,
      duration,
      category,
      capacity,
      equipmentType,
      equipment,
      description,
      room,
      level,
      enableNotifications,
      notificationMinutes
    } = req.body;

    // Verify instructor exists
    const instructor = await db.get(
      'SELECT id FROM users WHERE id = ? AND role IN ("instructor", "admin", "reception")',
      [instructorId]
    );

    if (!instructor) {
      return res.status(400).json({
        success: false,
        message: 'Invalid instructor ID'
      });
    }

    // Check for instructor conflicts (critical business rule)
    const instructorConflict = await checkInstructorConflict(date, time, duration, instructorId);
    if (instructorConflict.hasConflict) {
      const conflictDate = new Date(date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const conflictTime = formatTimeForDisplay(instructorConflict.conflictClass.time);
      const conflictEndTime = formatTimeForDisplay(instructorConflict.conflictClass.endTime);
      const newEndTime = formatTimeForDisplay(calculateEndTime(time, duration));
      
      return res.status(400).json({
        success: false,
        message: `⚠️ Scheduling Conflict Detected\n\n${instructorConflict.conflictClass.instructor_name} is already busy teaching "${instructorConflict.conflictClass.name}" from ${conflictTime} to ${conflictEndTime} on ${conflictDate}.\n\nYour requested time slot (${formatTimeForDisplay(time)} to ${newEndTime}) overlaps with this existing class.\n\n💡 Suggestions:\n• Choose a different time slot\n• Select a different instructor\n• Check the schedule for available times`,
        error_type: 'instructor_conflict',
        conflict_details: {
          instructor_name: instructorConflict.conflictClass.instructor_name,
          existing_class: instructorConflict.conflictClass.name,
          existing_time: conflictTime,
          existing_end_time: conflictEndTime,
          requested_time: formatTimeForDisplay(time),
          requested_end_time: newEndTime,
          date: conflictDate
        }
      });
    }

    // Check for room conflicts if room is specified
    if (room) {
      const roomConflict = await checkRoomConflict(date, time, duration, room);
      if (roomConflict.hasConflict) {
        return res.status(400).json({
          success: false,
          message: `Room conflict: ${room} is already booked by "${roomConflict.conflictClass.name}" from ${roomConflict.conflictClass.time} to ${roomConflict.conflictClass.endTime} on ${new Date(date).toLocaleDateString()}`
        });
      }
    }

    // Create class
    const result = await db.run(`
      INSERT INTO classes (
        name, instructor_id, date, time, duration, category, capacity, 
        equipment_type, equipment, description, room, level
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      name, instructorId, date, time, duration, category, capacity,
      equipmentType, JSON.stringify(equipment), description, room || null, level || null
    ]);

    // Save notification settings if provided
    if (enableNotifications !== undefined || notificationMinutes !== undefined) {
      await db.run(`
        INSERT INTO class_notification_settings (class_id, enable_notifications, notification_minutes)
        VALUES (?, ?, ?)
      `, [
        result.id,
        enableNotifications !== undefined ? (enableNotifications ? 1 : 0) : 1,
        notificationMinutes || 5
      ]);
    }

    // Get created class with instructor name
    const newClass = await db.get(`
      SELECT 
        c.*,
        u.name as instructor_name
      FROM classes c
      JOIN users u ON c.instructor_id = u.id
      WHERE c.id = ?
    `, [result.id]);

    newClass.equipment = JSON.parse(newClass.equipment);

    res.status(201).json({
      success: true,
      message: 'Class created successfully',
      data: newClass
    });

  } catch (error) {
    console.error('Create class error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Function to check room conflicts
async function checkRoomConflict(date, time, duration, room, excludeClassId = null) {
  try {
    // Calculate end time
    const [hours, minutes] = time.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + duration;
    const endHours = Math.floor(endMinutes / 60);
    const remainingMinutes = endMinutes % 60;
    const endTime = `${endHours.toString().padStart(2, '0')}:${remainingMinutes.toString().padStart(2, '0')}`;

    // Check for conflicts in the same room
    let query = `
      SELECT c.*, u.name as instructor_name
      FROM classes c
      JOIN users u ON c.instructor_id = u.id
      WHERE c.date = ? AND c.room = ? AND c.status = 'active'
    `;
    
    const params = [date, room];
    
    if (excludeClassId) {
      query += ' AND c.id != ?';
      params.push(excludeClassId);
    }

    const existingClasses = await db.all(query, params);

    for (const existingClass of existingClasses) {
      const existingStartMinutes = existingClass.time.split(':').map(Number);
      const existingStart = existingStartMinutes[0] * 60 + existingStartMinutes[1];
      const existingEnd = existingStart + existingClass.duration;

      // Check for time overlap
      if ((startMinutes < existingEnd) && (endMinutes > existingStart)) {
        const existingEndTime = `${Math.floor(existingEnd / 60).toString().padStart(2, '0')}:${(existingEnd % 60).toString().padStart(2, '0')}`;
        
        return {
          hasConflict: true,
          conflictClass: {
            ...existingClass,
            endTime: existingEndTime
          }
        };
      }
    }

    return { hasConflict: false };
  } catch (error) {
    console.error('Room conflict check error:', error);
    throw error;
  }
}

// Helper function to format time for display
function formatTimeForDisplay(timeStr) {
  if (!timeStr) return '';
  try {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const minute = parseInt(minutes);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minute.toString().padStart(2, '0')} ${ampm}`;
  } catch (error) {
    return timeStr;
  }
}

// Helper function to calculate end time from start time and duration
function calculateEndTime(startTime, duration) {
  try {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + duration;
    const endHours = Math.floor(endMinutes / 60);
    const remainingMinutes = endMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${remainingMinutes.toString().padStart(2, '0')}`;
  } catch (error) {
    return startTime;
  }
}

// Function to check instructor conflicts - prevents double booking of teachers
async function checkInstructorConflict(date, time, duration, instructorId, excludeClassId = null) {
  try {
    // Calculate end time
    const [hours, minutes] = time.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + duration;
    const endHours = Math.floor(endMinutes / 60);
    const remainingMinutes = endMinutes % 60;
    const endTime = `${endHours.toString().padStart(2, '0')}:${remainingMinutes.toString().padStart(2, '0')}`;

    // Check for conflicts with the same instructor
    let query = `
      SELECT c.*, u.name as instructor_name
      FROM classes c
      JOIN users u ON c.instructor_id = u.id
      WHERE c.date = ? AND c.instructor_id = ? AND c.status = 'active'
    `;
    
    const params = [date, instructorId];
    
    if (excludeClassId) {
      query += ' AND c.id != ?';
      params.push(excludeClassId);
    }

    const existingClasses = await db.all(query, params);

    for (const existingClass of existingClasses) {
      const existingStartMinutes = existingClass.time.split(':').map(Number);
      const existingStart = existingStartMinutes[0] * 60 + existingStartMinutes[1];
      const existingEnd = existingStart + existingClass.duration;

      // Check for time overlap
      if ((startMinutes < existingEnd) && (endMinutes > existingStart)) {
        const existingEndTime = `${Math.floor(existingEnd / 60).toString().padStart(2, '0')}:${(existingEnd % 60).toString().padStart(2, '0')}`;
        
        return {
          hasConflict: true,
          conflictClass: {
            ...existingClass,
            endTime: existingEndTime
          }
        };
      }
    }

    return { hasConflict: false };
  } catch (error) {
    console.error('Instructor conflict check error:', error);
    throw error;
  }
}

// PUT /api/classes/:id - Update class (admin or instructor)
router.put('/:id', authenticateToken, requireInstructor, [
  body('name').optional().notEmpty().withMessage('Class name cannot be empty'),
  body('instructorId').optional().isInt({ min: 1 }).withMessage('Valid instructor ID is required'),
  body('date').optional().isISO8601().withMessage('Valid date is required'),
  body('time').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid time is required'),
  body('duration').optional().isInt({ min: 15, max: 180 }).withMessage('Duration must be between 15-180 minutes'),
  body('category').optional().isIn(['personal', 'group']).withMessage('Category must be personal or group'),
  body('capacity').optional().isInt({ min: 1, max: 50 }).withMessage('Capacity must be between 1-50'),
  body('equipmentType').optional().isIn(['mat', 'reformer', 'both']).withMessage('Invalid equipment type'),
  body('equipment').optional().isArray().withMessage('Equipment must be an array'),
  body('description').optional(),
  body('room').optional().isIn(['Reformer Room', 'Mat Room', 'Cadillac Room', 'Wall Room', '']).withMessage('Invalid room selection'),
  body('level').optional().isIn(['Beginner', 'Intermediate', 'Advanced']).withMessage('Invalid level'),
  body('enableNotifications').optional().isBoolean().withMessage('Invalid enableNotifications format'),
  body('notificationMinutes').optional().isInt({ min: 1, max: 1440 }).withMessage('Notification minutes must be between 1-1440')
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

    const classExists = await db.get('SELECT * FROM classes WHERE id = ?', [req.params.id]);
    if (!classExists) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Check permissions: admin can edit any class, instructor can only edit their own
    if (req.user.role !== 'admin' && req.user.role !== 'reception' && classExists.instructor_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own classes'
      });
    }

    // Verify instructor exists if being updated
    if (req.body.instructorId) {
      const instructor = await db.get(
        'SELECT id FROM users WHERE id = ? AND role IN ("instructor", "admin", "reception")',
        [req.body.instructorId]
      );

      if (!instructor) {
        return res.status(400).json({
          success: false,
          message: 'Invalid instructor ID'
        });
      }
    }

    // Check for instructor conflicts if instructor, date, time, or duration is being updated
    if (req.body.instructorId !== undefined || req.body.date !== undefined || req.body.time !== undefined || req.body.duration !== undefined) {
      const instructorId = req.body.instructorId || classExists.instructor_id;
      const date = req.body.date || classExists.date;
      const time = req.body.time || classExists.time;
      const duration = req.body.duration || classExists.duration;
      
      const instructorConflict = await checkInstructorConflict(date, time, duration, instructorId, req.params.id);
      if (instructorConflict.hasConflict) {
        const conflictDate = new Date(date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        const conflictTime = formatTimeForDisplay(instructorConflict.conflictClass.time);
        const conflictEndTime = formatTimeForDisplay(instructorConflict.conflictClass.endTime);
        const newEndTime = formatTimeForDisplay(calculateEndTime(time, duration));
        
        return res.status(400).json({
          success: false,
          message: `⚠️ Scheduling Conflict Detected\n\n${instructorConflict.conflictClass.instructor_name} is already busy teaching "${instructorConflict.conflictClass.name}" from ${conflictTime} to ${conflictEndTime} on ${conflictDate}.\n\nYour requested time slot (${formatTimeForDisplay(time)} to ${newEndTime}) overlaps with this existing class.\n\n💡 Suggestions:\n• Choose a different time slot\n• Select a different instructor\n• Check the schedule for available times`,
          error_type: 'instructor_conflict',
          conflict_details: {
            instructor_name: instructorConflict.conflictClass.instructor_name,
            existing_class: instructorConflict.conflictClass.name,
            existing_time: conflictTime,
            existing_end_time: conflictEndTime,
            requested_time: formatTimeForDisplay(time),
            requested_end_time: newEndTime,
            date: conflictDate
          }
        });
      }
    }

    // Check for room conflicts if room is being updated
    if (req.body.room !== undefined) {
      const date = req.body.date || classExists.date;
      const time = req.body.time || classExists.time;
      const duration = req.body.duration || classExists.duration;
      
      if (req.body.room) {
        const roomConflict = await checkRoomConflict(date, time, duration, req.body.room, req.params.id);
        if (roomConflict.hasConflict) {
          return res.status(400).json({
            success: false,
            message: `Room conflict: ${req.body.room} is already booked by "${roomConflict.conflictClass.name}" from ${roomConflict.conflictClass.time} to ${roomConflict.conflictClass.endTime} on ${new Date(date).toLocaleDateString()}`
          });
        }
      }
    }

    const updates = {};
    const allowedFields = [
      'name', 'instructorId', 'date', 'time', 'duration', 'level', 'capacity', 
      'equipmentType', 'equipment', 'description', 'room', 'category'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'equipmentType') {
          updates.equipment_type = req.body[field];
        } else if (field === 'equipment') {
          updates.equipment = JSON.stringify(req.body[field]);
        } else if (field === 'instructorId') {
          updates.instructor_id = req.body[field];
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

    // Build update query
    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), req.params.id];

    await db.run(
      `UPDATE classes SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    // Update notification settings if provided
    if (req.body.enableNotifications !== undefined || req.body.notificationMinutes !== undefined) {
      // Check if notification settings exist
      const existingSettings = await db.get(`
        SELECT id FROM class_notification_settings WHERE class_id = ?
      `, [req.params.id]);

      if (existingSettings) {
        // Update existing settings
        const notificationUpdates = {};
        if (req.body.enableNotifications !== undefined) {
          notificationUpdates.enable_notifications = req.body.enableNotifications ? 1 : 0;
        }
        if (req.body.notificationMinutes !== undefined) {
          notificationUpdates.notification_minutes = req.body.notificationMinutes;
        }

        const setClause = Object.keys(notificationUpdates).map(key => `${key} = ?`).join(', ');
        const values = [...Object.values(notificationUpdates), req.params.id];

        await db.run(
          `UPDATE class_notification_settings SET ${setClause} WHERE class_id = ?`,
          values
        );
      } else {
        // Create new settings
        await db.run(`
          INSERT INTO class_notification_settings (class_id, enable_notifications, notification_minutes)
          VALUES (?, ?, ?)
        `, [
          req.params.id,
          req.body.enableNotifications !== undefined ? (req.body.enableNotifications ? 1 : 0) : 1,
          req.body.notificationMinutes || 5
        ]);
      }
    }

    // Get updated class
    const updatedClass = await db.get(`
      SELECT 
        c.*,
        u.name as instructor_name
      FROM classes c
      JOIN users u ON c.instructor_id = u.id
      WHERE c.id = ?
    `, [req.params.id]);

    updatedClass.equipment = JSON.parse(updatedClass.equipment);

    res.json({
      success: true,
      message: 'Class updated successfully',
      data: updatedClass
    });

  } catch (error) {
    console.error('Update class error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// DELETE /api/classes/:id - Delete class (admin only)
router.delete('/:id', authenticateToken, requireAdminOrReception, async (req, res) => {
  try {
    const existingClass = await db.get('SELECT id FROM classes WHERE id = ?', [req.params.id]);
    if (!existingClass) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    await db.run('DELETE FROM classes WHERE id = ?', [req.params.id]);

    res.json({
      success: true,
      message: 'Class deleted successfully'
    });

  } catch (error) {
    console.error('Delete class error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// PUT /api/classes/:id/cancel - Cancel class (admin or instructor)
router.put('/:id/cancel', authenticateToken, requireInstructor, async (req, res) => {
  try {
    const existingClass = await db.get('SELECT * FROM classes WHERE id = ?', [req.params.id]);
    if (!existingClass) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Check permissions
    if (req.user.role !== 'admin' && req.user.role !== 'reception' && existingClass.instructor_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await db.run(
      'UPDATE classes SET status = "cancelled", updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [req.params.id]
    );

    res.json({
      success: true,
      message: 'Class cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel class error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/classes/stats - Get class statistics (admin/reception only)
router.get('/stats', authenticateToken, requireAdminOrReception, async (req, res) => {
  try {
    // Get total classes
    const totalClasses = await db.get(`
      SELECT COUNT(*) as count FROM classes
    `);

    // Get total bookings and average attendance
    const attendanceStats = await db.get(`
      SELECT 
        COUNT(*) as total_bookings,
        AVG(CASE WHEN status IN ('confirmed', 'completed') THEN 1.0 ELSE 0.0 END) * 100 as attendance_rate
      FROM bookings
    `);

    // Get average class capacity utilization
    const capacityStats = await db.get(`
      SELECT 
        AVG(CAST(current_bookings AS FLOAT) / CAST(capacity AS FLOAT)) * 100 as avg_utilization
      FROM (
        SELECT 
          c.capacity,
          COUNT(b.id) as current_bookings
        FROM classes c
        LEFT JOIN bookings b ON c.id = b.class_id AND b.status IN ('confirmed', 'completed')
        GROUP BY c.id, c.capacity
      )
    `);

    // Get popular classes (by booking count)
    const popularClasses = await db.all(`
      SELECT 
        c.name,
        c.level,
        c.equipment_type,
        COUNT(b.id) as booking_count,
        AVG(CASE WHEN b.status IN ('confirmed', 'completed') THEN 1.0 ELSE 0.0 END) * 100 as attendance_rate
      FROM classes c
      LEFT JOIN bookings b ON c.id = b.class_id
      GROUP BY c.name, c.level, c.equipment_type
      HAVING booking_count > 0
      ORDER BY booking_count DESC
      LIMIT 10
    `);

    // Get instructor performance
    const instructorStats = await db.all(`
      SELECT 
        u.name as instructor_name,
        COUNT(DISTINCT c.id) as classes_taught,
        COUNT(b.id) as total_bookings,
        AVG(CASE WHEN b.status IN ('confirmed', 'completed') THEN 1.0 ELSE 0.0 END) * 100 as attendance_rate,
        AVG(CAST(class_bookings.booking_count AS FLOAT) / CAST(c.capacity AS FLOAT)) * 100 as avg_capacity_utilization
      FROM users u
      JOIN classes c ON u.id = c.instructor_id
      LEFT JOIN bookings b ON c.id = b.class_id
      LEFT JOIN (
        SELECT class_id, COUNT(*) as booking_count
        FROM bookings
        WHERE status IN ('confirmed', 'completed')
        GROUP BY class_id
      ) class_bookings ON c.id = class_bookings.class_id
      WHERE u.role = 'instructor'
      GROUP BY u.id, u.name
      ORDER BY classes_taught DESC
    `);

    // Get class distribution by equipment type
    const equipmentDistribution = await db.all(`
      SELECT 
        equipment_type,
        COUNT(*) as class_count,
        COUNT(DISTINCT b.id) as total_bookings
      FROM classes c
      LEFT JOIN bookings b ON c.id = b.class_id AND b.status IN ('confirmed', 'completed')
      GROUP BY equipment_type
      ORDER BY class_count DESC
    `);

    // Get class distribution by level
    const levelDistribution = await db.all(`
      SELECT 
        level,
        COUNT(*) as class_count,
        COUNT(DISTINCT b.id) as total_bookings
      FROM classes c
      LEFT JOIN bookings b ON c.id = b.class_id AND b.status IN ('confirmed', 'completed')
      GROUP BY level
      ORDER BY class_count DESC
    `);

    // Get monthly class trends (last 12 months)
    const monthlyTrends = await db.all(`
      SELECT 
        strftime('%Y-%m', c.date) as month,
        COUNT(DISTINCT c.id) as classes_scheduled,
        COUNT(b.id) as total_bookings
      FROM classes c
      LEFT JOIN bookings b ON c.id = b.class_id AND b.status IN ('confirmed', 'completed')
      WHERE c.date >= date('now', '-12 months')
      GROUP BY strftime('%Y-%m', c.date)
      ORDER BY month DESC
    `);

    res.json({
      success: true,
      data: {
        totalClasses: totalClasses.count,
        averageAttendanceRate: Math.round(attendanceStats.attendance_rate || 0),
        averageAttendance: Math.round(attendanceStats.total_bookings / Math.max(totalClasses.count, 1)),
        averageCapacityUtilization: Math.round(capacityStats.avg_utilization || 0),
        popularClasses: popularClasses.map(cls => ({
          ...cls,
          attendance_rate: Math.round(cls.attendance_rate)
        })),
        instructorStats: instructorStats.map(instructor => ({
          ...instructor,
          attendance_rate: Math.round(instructor.attendance_rate || 0),
          avg_capacity_utilization: Math.round(instructor.avg_capacity_utilization || 0)
        })),
        equipmentDistribution,
        levelDistribution,
        monthlyTrends
      }
    });

  } catch (error) {
    console.error('Get class stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router; 