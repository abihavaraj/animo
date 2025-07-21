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
    
    // Build Supabase query parameters
    let queryParams = new URLSearchParams();
    queryParams.append('client_id', `eq.${clientId}`);
    queryParams.append('select', '*,users!client_notes_created_by_fkey(name)');
    queryParams.append('order', 'created_at.desc');
    queryParams.append('limit', limit.toString());
    queryParams.append('offset', offset.toString());

    if (type) {
      queryParams.append('note_type', `eq.${type}`);
    }

    if (priority) {
      queryParams.append('priority', `eq.${priority}`);
    }

    const notesUrl = `${process.env.SUPABASE_URL}/rest/v1/client_notes?${queryParams.toString()}`;
    console.log('🔍 Fetching client notes with URL:', notesUrl);
    const notesResponse = await fetch(notesUrl, {
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!notesResponse.ok) {
      const errorText = await notesResponse.text();
      console.error('❌ Supabase error response:', errorText);
      throw new Error('Failed to fetch client notes: ' + errorText);
    }

    const notesData = await notesResponse.json();

    // Format notes and parse tags JSON
    const formattedNotes = notesData.map(note => ({
      ...note,
      admin_name: note.users?.name,
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
  body('clientId').isString().withMessage('Valid client ID is required'),
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

    // Verify client exists using Supabase
    const clientResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/users?id=eq.${clientId}&role=eq.client&select=id,name`, {
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!clientResponse.ok) {
      throw new Error('Failed to verify client');
    }

    const clientData = await clientResponse.json();
    if (clientData.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Create the note using Supabase
    const noteData = {
      client_id: clientId,
      created_by: req.user.id, // was admin_id
      note_type: noteType,
      title: title,
      content: content,
      priority: priority,
      is_private: isPrivate,
      tags: JSON.stringify(tags),
      reminder_at: reminderAt,
      reminder_message: reminderMessage,
      reminder_sent: false
    };

    const noteResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/client_notes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(noteData)
    });

    if (!noteResponse.ok) {
      const errorText = await noteResponse.text();
      console.error('❌ Supabase error response (POST client_notes):', errorText);
      throw new Error('Failed to create note: ' + errorText);
    }

    const newNoteData = await noteResponse.json();
    const newNote = newNoteData[0];

    // Log the activity using Supabase
    const activityData = {
      client_id: clientId,
      activity_type: 'note_added',
      description: `Admin note added: "${title}"`,
      performed_by: req.user.id
    };

    await fetch(`${process.env.SUPABASE_URL}/rest/v1/client_activity_log`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(activityData)
    });

    // Get the created note with admin name
    const noteWithAdminResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/client_notes?id=eq.${newNote.id}&select=*,users!client_notes_admin_id_fkey(name)`, {
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (noteWithAdminResponse.ok) {
      const noteWithAdminData = await noteWithAdminResponse.json();
      if (noteWithAdminData.length > 0) {
        const noteWithAdmin = noteWithAdminData[0];
        newNote.admin_name = noteWithAdmin.users?.name;
      }
    }

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