const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, requireAdmin, requireAdminOrReception } = require('../middleware/auth');

const router = express.Router();

// GET /api/client-notes/:clientId - Get all notes for a specific client
router.get('/:clientId', authenticateToken, requireAdminOrReception, async (req, res) => {
  try {
    const { clientId } = req.params;
    const { type, priority, limit = 50, offset = 0 } = req.query;
    
    let query = `
      SELECT 
        cn.*,
        u.name as admin_name
      FROM client_notes cn
      JOIN users u ON cn.admin_id = u.id
      WHERE cn.client_id = ?
    `;
    
    const params = [clientId];

    if (type) {
      query += ' AND cn.note_type = ?';
      params.push(type);
    }

    if (priority) {
      query += ' AND cn.priority = ?';
      params.push(priority);
    }

    query += ' ORDER BY cn.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const notes = await db.all(query, params);

    // Parse tags JSON
    const formattedNotes = notes.map(note => ({
      ...note,
      tags: note.tags ? JSON.parse(note.tags) : []
    }));

    res.json({
      success: true,
      data: formattedNotes
    });

  } catch (error) {
    console.error('Get client notes error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/client-notes - Create a new note for a client
router.post('/', authenticateToken, requireAdminOrReception, [
  body('clientId').isInt({ min: 1 }).withMessage('Valid client ID is required'),
  body('title').trim().isLength({ min: 1 }).withMessage('Title is required'),
  body('content').trim().isLength({ min: 1 }).withMessage('Content is required'),
  body('noteType').optional().isIn(['general', 'medical', 'billing', 'behavior', 'retention', 'complaint', 'compliment']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('tags').optional().isArray(),
  body('reminderAt').optional().isISO8601().withMessage('reminderAt must be a valid ISO date'),
  body('reminderMessage').optional().isString(),
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
      clientId, 
      title, 
      content, 
      noteType = 'general', 
      priority = 'medium',
      isPrivate = false,
      tags = [],
      reminderAt = null,
      reminderMessage = null
    } = req.body;

    // Verify client exists
    const client = await db.get('SELECT id, name FROM users WHERE id = ? AND role = "client"', [clientId]);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Create the note
    const result = await db.run(`
      INSERT INTO client_notes (
        client_id, admin_id, note_type, title, content, priority, is_private, tags, reminder_at, reminder_message, reminder_sent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `, [
      clientId,
      req.user.id,
      noteType,
      title,
      content,
      priority,
      isPrivate ? 1 : 0,
      JSON.stringify(tags),
      reminderAt,
      reminderMessage
    ]);

    // Log the activity
    await db.run(`
      INSERT INTO client_activity_log (
        client_id, activity_type, description, performed_by
      ) VALUES (?, ?, ?, ?)
    `, [
      clientId,
      'note_added',
      `Admin note added: "${title}"`,
      req.user.id
    ]);

    // Get the created note with admin name
    const newNote = await db.get(`
      SELECT 
        cn.*,
        u.name as admin_name
      FROM client_notes cn
      JOIN users u ON cn.admin_id = u.id
      WHERE cn.id = ?
    `, [result.id]);

    // Parse tags
    newNote.tags = newNote.tags ? JSON.parse(newNote.tags) : [];

    res.status(201).json({
      success: true,
      message: 'Note created successfully',
      data: newNote
    });

  } catch (error) {
    console.error('Create client note error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// PUT /api/client-notes/:noteId - Update a note
router.put('/:noteId', authenticateToken, requireAdmin, [
  body('title').optional().trim().isLength({ min: 1 }),
  body('content').optional().trim().isLength({ min: 1 }),
  body('noteType').optional().isIn(['general', 'medical', 'billing', 'behavior', 'retention', 'complaint', 'compliment']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('tags').optional().isArray(),
  body('reminderAt').optional().isISO8601().withMessage('reminderAt must be a valid ISO date'),
  body('reminderMessage').optional().isString(),
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

    const { noteId } = req.params;
    const { title, content, noteType, priority, isPrivate, tags, reminderAt, reminderMessage } = req.body;

    // Check if note exists
    const existingNote = await db.get('SELECT * FROM client_notes WHERE id = ?', [noteId]);
    if (!existingNote) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    // Build update query
    const updates = [];
    const params = [];

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }
    if (content !== undefined) {
      updates.push('content = ?');
      params.push(content);
    }
    if (noteType !== undefined) {
      updates.push('note_type = ?');
      params.push(noteType);
    }
    if (priority !== undefined) {
      updates.push('priority = ?');
      params.push(priority);
    }
    if (isPrivate !== undefined) {
      updates.push('is_private = ?');
      params.push(isPrivate ? 1 : 0);
    }
    if (tags !== undefined) {
      updates.push('tags = ?');
      params.push(JSON.stringify(tags));
    }
    if (reminderAt !== undefined) {
      updates.push('reminder_at = ?');
      params.push(reminderAt);
    }
    if (reminderMessage !== undefined) {
      updates.push('reminder_message = ?');
      params.push(reminderMessage);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(noteId);

    await db.run(
      `UPDATE client_notes SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // Log the activity
    await db.run(`
      INSERT INTO client_activity_log (
        client_id, activity_type, description, performed_by
      ) VALUES (?, ?, ?, ?)
    `, [
      existingNote.client_id,
      'note_added',
      `Admin note updated: "${title || existingNote.title}"`,
      req.user.id
    ]);

    // Get updated note
    const updatedNote = await db.get(`
      SELECT 
        cn.*,
        u.name as admin_name
      FROM client_notes cn
      JOIN users u ON cn.admin_id = u.id
      WHERE cn.id = ?
    `, [noteId]);

    updatedNote.tags = updatedNote.tags ? JSON.parse(updatedNote.tags) : [];

    res.json({
      success: true,
      message: 'Note updated successfully',
      data: updatedNote
    });

  } catch (error) {
    console.error('Update client note error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// DELETE /api/client-notes/:noteId - Delete a note
router.delete('/:noteId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { noteId } = req.params;

    // Check if note exists
    const note = await db.get('SELECT * FROM client_notes WHERE id = ?', [noteId]);
    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Note not found'
      });
    }

    // Delete the note
    await db.run('DELETE FROM client_notes WHERE id = ?', [noteId]);

    // Log the activity
    await db.run(`
      INSERT INTO client_activity_log (
        client_id, activity_type, description, performed_by
      ) VALUES (?, ?, ?, ?)
    `, [
      note.client_id,
      'note_added',
      `Admin note deleted: "${note.title}"`,
      req.user.id
    ]);

    res.json({
      success: true,
      message: 'Note deleted successfully'
    });

  } catch (error) {
    console.error('Delete client note error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/client-notes/stats/:clientId - Get note statistics for a client
router.get('/stats/:clientId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { clientId } = req.params;

    // Get note counts by type and priority
    const typeStats = await db.all(`
      SELECT note_type, COUNT(*) as count
      FROM client_notes
      WHERE client_id = ?
      GROUP BY note_type
    `, [clientId]);

    const priorityStats = await db.all(`
      SELECT priority, COUNT(*) as count
      FROM client_notes
      WHERE client_id = ?
      GROUP BY priority
    `, [clientId]);

    const totalNotes = await db.get(`
      SELECT COUNT(*) as count
      FROM client_notes
      WHERE client_id = ?
    `, [clientId]);

    const recentNotes = await db.get(`
      SELECT COUNT(*) as count
      FROM client_notes
      WHERE client_id = ? AND created_at >= date('now', '-30 days')
    `, [clientId]);

    res.json({
      success: true,
      data: {
        totalNotes: totalNotes.count,
        recentNotes: recentNotes.count,
        byType: typeStats.reduce((acc, item) => {
          acc[item.note_type] = item.count;
          return acc;
        }, {}),
        byPriority: priorityStats.reduce((acc, item) => {
          acc[item.priority] = item.count;
          return acc;
        }, {})
      }
    });

  } catch (error) {
    console.error('Get note stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/client-notes/reminders - Get notes with reminders for reception dashboard
router.get('/reminders', authenticateToken, requireAdminOrReception, async (req, res) => {
  try {
    const notes = await db.all(`
      SELECT 
        cn.*,
        u.name as client_name,
        u.id as client_id
      FROM client_notes cn
      JOIN users u ON cn.client_id = u.id
      WHERE cn.reminder_at IS NOT NULL
        AND cn.reminder_sent = 0
      ORDER BY cn.reminder_at ASC
    `);

    res.json({
      success: true,
      data: notes
    });
  } catch (error) {
    console.error('Error fetching notes with reminders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notes with reminders'
    });
  }
});

module.exports = router; 