const express = require('express');
const Database = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const pushNotificationService = require('../services/pushNotificationService');
const router = express.Router();

// Helper function to get enrolled users for a class
async function getEnrolledUsers(classId) {
  const enrolledUsers = await Database.all(`
    SELECT DISTINCT u.id, u.name, u.email
    FROM users u
    INNER JOIN bookings b ON u.id = b.user_id
    WHERE b.class_id = ? AND b.status = 'confirmed'
  `, [classId]);
  return enrolledUsers;
}

// Helper function to format notification message
function formatNotificationMessage(type, classData, minutes = 5) {
  const formatTime = (time) => {
    try {
      return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return time;
    }
  };

  switch (type) {
    case 'reminder':
      return `🧘‍♀️ Class Reminder: "${classData.name}" with ${classData.instructor_name} starts in ${minutes} minutes at ${formatTime(classData.time)}. See you there!`;
    case 'cancellation':
      return `❌ Class Cancelled: "${classData.name}" scheduled for ${new Date(classData.date).toLocaleDateString()} at ${formatTime(classData.time)} has been cancelled. We apologize for any inconvenience.`;
    case 'update':
      return `📝 Class Updated: "${classData.name}" on ${new Date(classData.date).toLocaleDateString()} has been updated. Please check the latest details in the app.`;
    default:
      return `Class notification for "${classData.name}"`;
  }
}

// Schedule notifications for a class
router.post('/schedule', async (req, res) => {
  try {
    const { classId, type, message, scheduledTime } = req.body;

    if (!classId || !type) {
      return res.status(400).json({
        success: false,
        message: 'Class ID and type are required'
      });
    }

    // Get class data
    const classData = await Database.get(`
      SELECT c.*, u.name as instructor_name
      FROM classes c
      LEFT JOIN users u ON c.instructor_id = u.id
      WHERE c.id = ?
    `, [classId]);

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Get class notification settings to check if class notifications are enabled
    const classSettings = await Database.get(`
      SELECT * FROM class_notification_settings WHERE class_id = ?
    `, [classId]);

    const classEnableNotifications = classSettings?.enable_notifications !== 0;

    if (!classEnableNotifications) {
      return res.json({
        success: true,
        message: 'Notifications disabled for this class'
      });
    }

    // Get enrolled users
    const enrolledUsers = await getEnrolledUsers(classId);

    if (enrolledUsers.length === 0) {
      return res.json({
        success: true,
        message: 'No enrolled users found for this class'
      });
    }

    // Create notifications for each enrolled user with their personal settings
    let notificationsCreated = 0;
    
    for (const user of enrolledUsers) {
      // Check user notification settings
      const userSettings = await Database.get(`
        SELECT * FROM notification_settings WHERE user_id = ?
      `, [user.id]);

      const userEnableNotifications = userSettings?.enable_notifications !== 0;
      const userReminderMinutes = userSettings?.default_reminder_minutes || 15;

      if (userEnableNotifications) {
        // Calculate notification time based on user's personal settings
        let notificationTime = scheduledTime;
        if (!notificationTime && type === 'reminder') {
          const classDateTime = new Date(`${classData.date}T${classData.time}`);
          notificationTime = new Date(classDateTime.getTime() - (userReminderMinutes * 60 * 1000)).toISOString();
        }

        const notificationMessage = message || formatNotificationMessage(type, classData, userReminderMinutes);
        
        await Database.run(`
          INSERT INTO notifications (class_id, user_id, type, message, scheduled_time)
          VALUES (?, ?, ?, ?, ?)
        `, [classId, user.id, type, notificationMessage, notificationTime]);
        
        notificationsCreated++;
      }
    }

    console.log(`📅 Scheduled ${type} notifications for class "${classData.name}" (${notificationsCreated} users with personal settings)`);

    res.json({
      success: true,
      message: `Notifications scheduled for ${notificationsCreated} users with personal settings`,
      data: {
        classId,
        type,
        usersNotified: notificationsCreated,
        totalEnrolled: enrolledUsers.length
      }
    });

  } catch (error) {
    console.error('Error scheduling notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to schedule notifications',
      error: error.message
    });
  }
});

// Send immediate notification
router.post('/send', async (req, res) => {
  try {
    const { classId, type, message, targetUsers } = req.body;

    if (!classId || !type || !message) {
      return res.status(400).json({
        success: false,
        message: 'Class ID, type, and message are required'
      });
    }

    // Get class data
    const classData = await Database.get(`
      SELECT c.*, u.name as instructor_name
      FROM classes c
      LEFT JOIN users u ON c.instructor_id = u.id
      WHERE c.id = ?
    `, [classId]);

    if (!classData) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Get target users (either specified users or all enrolled users)
    let users;
    if (targetUsers && targetUsers.length > 0) {
      const userIds = targetUsers.map(id => `'${id}'`).join(',');
      users = await Database.all(`
        SELECT id, name, email FROM users WHERE id IN (${userIds})
      `);
    } else {
      users = await getEnrolledUsers(classId);
    }

    if (users.length === 0) {
      return res.json({
        success: true,
        message: 'No users found to notify'
      });
    }

    // Send notifications immediately
    const sentAt = new Date().toISOString();
    let notificationsSent = 0;

    for (const user of users) {
      // Check user notification settings
      const userSettings = await Database.get(`
        SELECT * FROM notification_settings WHERE user_id = ?
      `, [user.id]);

      const userEnableNotifications = userSettings?.enable_notifications !== 0;

      if (userEnableNotifications) {
        await Database.run(`
          INSERT INTO notifications (class_id, user_id, type, message, scheduled_time, sent, sent_at)
          VALUES (?, ?, ?, ?, ?, 1, ?)
        `, [classId, user.id, type, message, sentAt, sentAt]);

        await pushNotificationService.send(user, message);
        console.log(`📱 Notification sent to ${user.name}: ${message}`);
        notificationsSent++;
      }
    }

    console.log(`📨 Sent ${type} notifications for class "${classData.name}" (${notificationsSent} users)`);

    res.json({
      success: true,
      message: `Notifications sent to ${notificationsSent} users`,
      data: {
        classId,
        type,
        notificationsSent,
        totalUsers: users.length
      }
    });

  } catch (error) {
    console.error('Error sending notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send notifications',
      error: error.message
    });
  }
});

// Cancel scheduled notifications for a class
router.delete('/class/:classId', async (req, res) => {
  try {
    const { classId } = req.params;

    // Delete unsent notifications for the class
    const result = await Database.run(`
      DELETE FROM notifications
      WHERE class_id = ? AND sent = 0
    `, [classId]);

    console.log(`🗑️ Cancelled ${result.changes} scheduled notifications for class ${classId}`);

    res.json({
      success: true,
      message: `Cancelled ${result.changes} scheduled notifications`,
      data: {
        classId,
        cancelledNotifications: result.changes
      }
    });

  } catch (error) {
    console.error('Error cancelling notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel notifications',
      error: error.message
    });
  }
});

// Get notifications for a user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const notifications = await Database.all(`
      SELECT n.*, c.name as class_name, c.date as class_date, c.time as class_time
      FROM notifications n
      LEFT JOIN classes c ON n.class_id = c.id
      WHERE n.user_id = ?
      ORDER BY n.created_at DESC
      LIMIT ? OFFSET ?
    `, [userId, limit, offset]);

    res.json({
      success: true,
      data: notifications
    });

  } catch (error) {
    console.error('Error fetching user notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message
    });
  }
});

// GET /api/notifications/settings - Get user notification settings
router.get('/settings', authenticateToken, async (req, res) => {
  try {
    // Get user notification settings, create defaults if they don't exist
    let userSettings = await Database.get(`
      SELECT * FROM notification_settings WHERE user_id = ?
    `, [req.user.id]);

    if (!userSettings) {
      // Create default settings
      await Database.run(`
        INSERT INTO notification_settings (user_id, enable_notifications, default_reminder_minutes)
        VALUES (?, 1, 15)
      `, [req.user.id]);

      userSettings = {
        user_id: req.user.id,
        enable_notifications: 1,
        default_reminder_minutes: 15,
        enable_push_notifications: 1,
        enable_email_notifications: 1
      };
    }

    res.json({
      success: true,
      data: userSettings
    });

  } catch (error) {
    console.error('Error getting notification settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get notification settings'
    });
  }
});

// PUT /api/notifications/settings - Update user notification settings
router.put('/settings', authenticateToken, async (req, res) => {
  try {
    const { enable_notifications, default_reminder_minutes, enable_push_notifications, enable_email_notifications } = req.body;

    // Check if settings exist
    const existingSettings = await Database.get(`
      SELECT id FROM notification_settings WHERE user_id = ?
    `, [req.user.id]);

    if (existingSettings) {
      // Update existing settings
      const updates = {};
      if (enable_notifications !== undefined) updates.enable_notifications = enable_notifications ? 1 : 0;
      if (default_reminder_minutes !== undefined) updates.default_reminder_minutes = default_reminder_minutes;
      if (enable_push_notifications !== undefined) updates.enable_push_notifications = enable_push_notifications ? 1 : 0;
      if (enable_email_notifications !== undefined) updates.enable_email_notifications = enable_email_notifications ? 1 : 0;

      if (Object.keys(updates).length > 0) {
        updates.updated_at = new Date().toISOString();
        const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = [...Object.values(updates), req.user.id];

        await Database.run(
          `UPDATE notification_settings SET ${setClause} WHERE user_id = ?`,
          values
        );
      }
    } else {
      // Create new settings
      await Database.run(`
        INSERT INTO notification_settings (
          user_id, enable_notifications, default_reminder_minutes, 
          enable_push_notifications, enable_email_notifications
        ) VALUES (?, ?, ?, ?, ?)
      `, [
        req.user.id,
        enable_notifications !== undefined ? (enable_notifications ? 1 : 0) : 1,
        default_reminder_minutes || 15,
        enable_push_notifications !== undefined ? (enable_push_notifications ? 1 : 0) : 1,
        enable_email_notifications !== undefined ? (enable_email_notifications ? 1 : 0) : 1
      ]);
    }

    // Return updated settings
    const updatedSettings = await Database.get(`
      SELECT * FROM notification_settings WHERE user_id = ?
    `, [req.user.id]);

    console.log(`⚙️ Updated notification settings for user ${req.user.id}:`);
    console.log(`   - Notifications enabled: ${updatedSettings.enable_notifications ? 'Yes' : 'No'}`);
    console.log(`   - Default reminder: ${updatedSettings.default_reminder_minutes} minutes`);

    res.json({
      success: true,
      message: 'Notification settings updated successfully',
      data: updatedSettings
    });

  } catch (error) {
    console.error('Error updating notification settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notification settings'
    });
  }
});

// Test notification endpoint
router.post('/test', async (req, res) => {
  try {
    const { userId, message } = req.body;

    if (!userId || !message) {
      return res.status(400).json({
        success: false,
        message: 'User ID and message are required'
      });
    }

    // Get user info
    const user = await Database.get(`
      SELECT name, email FROM users WHERE id = ?
    `, [userId]);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await pushNotificationService.send(user, message);
    console.log(`🧪 Test notification sent to ${user.name}: ${message}`);

    res.json({
      success: true,
      message: `Test notification sent to ${user.name}`,
      data: {
        userId,
        userName: user.name,
        message
      }
    });

  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test notification',
      error: error.message
    });
  }
});

// Get notification statistics
router.get('/stats', async (req, res) => {
  try {
    const { classId } = req.query;

    let stats;

    if (classId) {
      // Get stats for specific class
      stats = await Database.all(`
        SELECT
          type,
          COUNT(*) as total,
          SUM(CASE WHEN sent = 1 THEN 1 ELSE 0 END) as sent,
          SUM(CASE WHEN sent = 0 THEN 1 ELSE 0 END) as pending
        FROM notifications
        WHERE class_id = ?
        GROUP BY type
      `, [classId]);
    } else {
      // Get overall stats
      stats = await Database.all(`
        SELECT
          type,
          COUNT(*) as total,
          SUM(CASE WHEN sent = 1 THEN 1 ELSE 0 END) as sent,
          SUM(CASE WHEN sent = 0 THEN 1 ELSE 0 END) as pending
        FROM notifications
        GROUP BY type
      `);
    }

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching notification stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification statistics',
      error: error.message
    });
  }
});

// GET /api/notifications/recent - Get recent notifications for reception
router.get('/recent', async (req, res) => {
  try {
    console.log('🔔 Getting recent notifications for reception...');
    
    // Get recent activity that would be relevant for reception staff
    const recentNotifications = [];
    
    // Recent client registrations (last 24 hours)
    console.log('🔔 Querying recent users...');
    const recentUsers = await Database.all(`
      SELECT id, name, email, created_at
      FROM users 
      WHERE role = 'client' 
        AND created_at >= datetime('now', '-1 day')
      ORDER BY created_at DESC 
      LIMIT 3
    `);
    console.log(`🔔 Found ${recentUsers.length} recent users`);
    
    // Get list of read notifications
    console.log('🔔 Querying read notifications...');
    const readNotifications = await Database.all(`
      SELECT notification_id FROM notifications_read
    `);
    const readNotificationIds = readNotifications.map(n => n.notification_id);
    console.log(`🔔 Found ${readNotificationIds.length} read notifications`);
    
    // Helper function to calculate time ago consistently
    const getTimeAgo = (dateString) => {
      const createdAt = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - createdAt.getTime();
      const diffMinutes = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMinutes / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMinutes < 1) return 'Just now';
      if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
      if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
      return createdAt.toLocaleDateString();
    };

    recentUsers.forEach((user, index) => {
      const timeAgo = getTimeAgo(user.created_at);
      const notificationId = `user-${user.id}`;
      recentNotifications.push({
        id: notificationId,
        message: `New client registration: ${user.name}`,
        time: timeAgo,
        type: 'client',
        read: readNotificationIds.includes(notificationId)
      });
      console.log(`🔔 Added user notification: ${user.name} (${timeAgo})`);
    });
    
    // Recent bookings (pending ones)
    console.log('🔔 Querying pending bookings...');
    const pendingBookings = await Database.all(`
      SELECT b.id, b.created_at, u.name as user_name, c.name as class_name
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN classes c ON b.class_id = c.id
      WHERE b.status = 'pending'
        AND b.created_at >= datetime('now', '-6 hours')
      ORDER BY b.created_at DESC
      LIMIT 2
    `);
    console.log(`🔔 Found ${pendingBookings.length} pending bookings`);
    
    pendingBookings.forEach((booking) => {
      const timeAgo = getTimeAgo(booking.created_at);
      const notificationId = `booking-${booking.id}`;
      recentNotifications.push({
        id: notificationId,
        message: `New booking: ${booking.user_name} for "${booking.class_name}"`,
        time: timeAgo,
        type: 'booking',
        read: readNotificationIds.includes(notificationId)
      });
      console.log(`🔔 Added booking notification: ${booking.user_name} for ${booking.class_name} (${timeAgo})`);
    });
    
    // Recent payment notifications (if payment tables exist)
    try {
      console.log('🔔 Querying recent payments...');
      const recentPayments = await Database.all(`
        SELECT p.id, p.created_at, u.name as user_name, p.amount
        FROM payments p
        JOIN users u ON p.user_id = u.id
        WHERE p.status = 'completed'
          AND p.created_at >= datetime('now', '-2 hours')
        ORDER BY p.created_at DESC
        LIMIT 1
      `);
      console.log(`🔔 Found ${recentPayments.length} recent payments`);
      
      recentPayments.forEach((payment) => {
        const timeAgo = getTimeAgo(payment.created_at);
        const notificationId = `payment-${payment.id}`;
        recentNotifications.push({
          id: notificationId,
          message: `Payment received: $${payment.amount} from ${payment.user_name}`,
          time: timeAgo,
          type: 'payment',
          read: readNotificationIds.includes(notificationId)
        });
        console.log(`🔔 Added payment notification: $${payment.amount} from ${payment.user_name} (${timeAgo})`);
      });
    } catch (paymentError) {
      // Payment table might not exist, skip payments
      console.log('📊 Payment table not found, skipping payment notifications');
    }
    
    // Client note reminders (due reminders)
    try {
      console.log('🔔 Querying client note reminders...');
      const dueReminders = await Database.all(`
        SELECT 
          cn.id,
          cn.title,
          cn.reminder_at,
          cn.reminder_message,
          u.name as client_name,
          u.id as client_id
        FROM client_notes cn
        JOIN users u ON cn.client_id = u.id
        WHERE cn.reminder_at IS NOT NULL
          AND cn.reminder_sent = 0
          AND cn.reminder_at <= datetime('now')
        ORDER BY cn.reminder_at ASC
        LIMIT 5
      `);
      console.log(`🔔 Found ${dueReminders.length} due reminders`);
      
      dueReminders.forEach((reminder) => {
        const timeAgo = getTimeAgo(reminder.reminder_at);
        const notificationId = `reminder-${reminder.id}`;
        const reminderMessage = reminder.reminder_message || reminder.title;
        
        recentNotifications.push({
          id: notificationId,
          message: `Reminder: ${reminderMessage} - ${reminder.client_name}`,
          time: timeAgo,
          type: 'reminder',
          read: readNotificationIds.includes(notificationId),
          clientId: reminder.client_id,
          noteId: reminder.id,
          reminderAt: reminder.reminder_at
        });
        console.log(`🔔 Added reminder notification: ${reminderMessage} for ${reminder.client_name} (${timeAgo})`);
      });
    } catch (reminderError) {
      // Client notes table might not exist, skip reminders
      console.log('📝 Client notes table not found, skipping reminder notifications');
    }
    
    // Sort notifications by most recent
    recentNotifications.sort((a, b) => {
      const aMinutes = getMinutesFromTimeAgo(a.time);
      const bMinutes = getMinutesFromTimeAgo(b.time);
      return aMinutes - bMinutes;
    });
    
    console.log(`🔔 Returning ${recentNotifications.length} recent notifications`);
    console.log('🔔 Notifications:', recentNotifications);
    
    res.json({
      success: true,
      data: recentNotifications.slice(0, 5) // Limit to 5 most recent
    });
    
  } catch (error) {
    console.error('🔔 Error getting recent notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get recent notifications',
      error: error.message
    });
  }
});

// Helper function to convert time ago to minutes for sorting
function getMinutesFromTimeAgo(timeAgo) {
  if (timeAgo === 'Just now') return 0;
  const match = timeAgo.match(/(\d+)\s+(minute|hour)/);
  if (!match) return 999;
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  return unit === 'hour' ? value * 60 : value;
}

// PUT /api/notifications/:notificationId/read - Mark notification as read
router.put('/:notificationId/read', async (req, res) => {
  try {
    const { notificationId } = req.params;
    console.log(`🔔 Marking notification ${notificationId} as read`);
    
    // Since reception notifications are dynamically generated, we'll store read status
    // in a simple table for reception staff
    
    // Check if notifications_read table exists, create if not
    try {
      await Database.run(`
        CREATE TABLE IF NOT EXISTS notifications_read (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          notification_id TEXT NOT NULL,
          read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(notification_id)
        )
      `);
    } catch (createError) {
      console.log('Table creation error (probably already exists):', createError.message);
    }
    
    // Mark notification as read (or update if already exists)
    await Database.run(`
      INSERT OR REPLACE INTO notifications_read (notification_id, read_at)
      VALUES (?, datetime('now'))
    `, [notificationId]);
    
    console.log(`✅ Notification ${notificationId} marked as read`);
    
    res.json({
      success: true,
      message: 'Notification marked as read'
    });
    
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message
    });
  }
});

// PUT /api/notifications/reminder/:noteId/handle - Mark reminder as handled
router.put('/reminder/:noteId/handle', async (req, res) => {
  try {
    const { noteId } = req.params;
    console.log(`🔔 Marking reminder ${noteId} as handled`);
    
    // Mark the reminder as sent/handled
    await Database.run(`
      UPDATE client_notes SET reminder_sent = 1 WHERE id = ?
    `, [noteId]);
    
    console.log(`✅ Reminder ${noteId} marked as handled`);
    
    res.json({
      success: true,
      message: 'Reminder marked as handled'
    });
    
  } catch (error) {
    console.error('Error marking reminder as handled:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark reminder as handled',
      error: error.message
    });
  }
});

module.exports = router; 