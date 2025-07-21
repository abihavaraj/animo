const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { authenticateToken, requireAdmin, requireAdminOrReception } = require('../middleware/auth');

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads/client-documents');
fs.mkdir(uploadsDir, { recursive: true }).catch(console.error);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: clientId_timestamp_originalname
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    const sanitizedBasename = basename.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${req.body.clientId || 'unknown'}_${timestamp}_${sanitizedBasename}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images and common document types
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 
      'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, PDF, and document files are allowed.'));
    }
  }
});

// GET /api/client-documents/:clientId - Get all documents for a client
router.get('/:clientId', authenticateToken, requireAdminOrReception, async (req, res) => {
  try {
    const { clientId } = req.params;
    const { type, limit = 50, offset = 0 } = req.query;
    
    let query = `
      SELECT 
        cd.*,
        u.name as uploaded_by_name
      FROM client_documents cd
      JOIN users u ON cd.uploaded_by = u.id
      WHERE cd.client_id = ?
    `;
    
    const params = [clientId];

    if (type) {
      query += ' AND cd.document_type = ?';
      params.push(type);
    }

    query += ' ORDER BY cd.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const documents = await db.all(query, params);

    res.json({
      success: true,
      data: documents
    });

  } catch (error) {
    console.error('Get client documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/client-documents/upload - Upload a document for a client
router.post('/upload', authenticateToken, requireAdminOrReception, upload.single('file'), [
  body('clientId').notEmpty().withMessage('Valid client ID is required'),
  body('documentType').isIn(['photo', 'contract', 'medical_form', 'id_copy', 'waiver', 'receipt', 'other']).withMessage('Valid document type is required'),
  body('description').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Delete uploaded file if validation fails
      if (req.file) {
        await fs.unlink(req.file.path).catch(console.error);
      }
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { clientId, documentType, description, isSensitive = false, expiryDate } = req.body;

    // Verify client exists
    const client = await db.get('SELECT id, name FROM users WHERE id = ? AND role = "client"', [clientId]);
    if (!client) {
      // Delete uploaded file
      await fs.unlink(req.file.path).catch(console.error);
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Save document info to database
    const result = await db.run(`
      INSERT INTO client_documents (
        client_id, uploaded_by, document_type, file_name, original_name,
        file_path, file_size, mime_type, description, is_sensitive, expiry_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      clientId,
      req.user.id,
      documentType,
      req.file.filename,
      req.file.originalname,
      req.file.path,
      req.file.size,
      req.file.mimetype,
      description || null,
      isSensitive ? 1 : 0,
      expiryDate || null
    ]);

    // Log the activity
    await db.run(`
      INSERT INTO client_activity_log (
        client_id, activity_type, description, performed_by
      ) VALUES (?, ?, ?, ?)
    `, [
      clientId,
      'document_uploaded',
      `Document uploaded: ${documentType} - "${req.file.originalname}"`,
      req.user.id
    ]);

    // Get the created document with uploader name
    const newDocument = await db.get(`
      SELECT 
        cd.*,
        u.name as uploaded_by_name
      FROM client_documents cd
      JOIN users u ON cd.uploaded_by = u.id
      WHERE cd.id = ?
    `, [result.id]);

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: newDocument
    });

  } catch (error) {
    console.error('Upload document error:', error);
    // Clean up uploaded file on error
    if (req.file) {
      await fs.unlink(req.file.path).catch(console.error);
    }
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/client-documents/download/:documentId - Download a document
router.get('/download/:documentId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { documentId } = req.params;

    const document = await db.get('SELECT * FROM client_documents WHERE id = ?', [documentId]);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Check if file exists
    try {
      await fs.access(document.file_path);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'File not found on disk'
      });
    }

    // Set appropriate headers
    res.setHeader('Content-Type', document.mime_type);
    res.setHeader('Content-Disposition', `attachment; filename="${document.original_name}"`);

    // Send file
    res.sendFile(path.resolve(document.file_path));

  } catch (error) {
    console.error('Download document error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/client-documents/view/:documentId - View a document (for images)
router.get('/view/:documentId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { documentId } = req.params;

    const document = await db.get('SELECT * FROM client_documents WHERE id = ?', [documentId]);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Check if file exists
    try {
      await fs.access(document.file_path);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'File not found on disk'
      });
    }

    // Set appropriate headers for inline viewing
    res.setHeader('Content-Type', document.mime_type);
    res.setHeader('Content-Disposition', 'inline');

    // Send file
    res.sendFile(path.resolve(document.file_path));

  } catch (error) {
    console.error('View document error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// PUT /api/client-documents/:documentId - Update document metadata
router.put('/:documentId', authenticateToken, requireAdmin, [
  body('description').optional().trim(),
  body('documentType').optional().isIn(['photo', 'contract', 'medical_form', 'id_copy', 'waiver', 'receipt', 'other']),
  body('expiryDate').optional().isISO8601()
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

    const { documentId } = req.params;
    const { description, documentType, isSensitive, expiryDate } = req.body;

    // Check if document exists
    const existingDocument = await db.get('SELECT * FROM client_documents WHERE id = ?', [documentId]);
    if (!existingDocument) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Build update query
    const updates = [];
    const params = [];

    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (documentType !== undefined) {
      updates.push('document_type = ?');
      params.push(documentType);
    }
    if (isSensitive !== undefined) {
      updates.push('is_sensitive = ?');
      params.push(isSensitive ? 1 : 0);
    }
    if (expiryDate !== undefined) {
      updates.push('expiry_date = ?');
      params.push(expiryDate);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    params.push(documentId);

    await db.run(
      `UPDATE client_documents SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // Get updated document
    const updatedDocument = await db.get(`
      SELECT 
        cd.*,
        u.name as uploaded_by_name
      FROM client_documents cd
      JOIN users u ON cd.uploaded_by = u.id
      WHERE cd.id = ?
    `, [documentId]);

    res.json({
      success: true,
      message: 'Document updated successfully',
      data: updatedDocument
    });

  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// DELETE /api/client-documents/:documentId - Delete a document
router.delete('/:documentId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { documentId } = req.params;

    // Check if document exists
    const document = await db.get('SELECT * FROM client_documents WHERE id = ?', [documentId]);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Delete the file from disk
    try {
      await fs.unlink(document.file_path);
    } catch (error) {
      console.error('Failed to delete file from disk:', error);
      // Continue with database deletion even if file deletion fails
    }

    // Delete from database
    await db.run('DELETE FROM client_documents WHERE id = ?', [documentId]);

    // Log the activity
    await db.run(`
      INSERT INTO client_activity_log (
        client_id, activity_type, description, performed_by
      ) VALUES (?, ?, ?, ?)
    `, [
      document.client_id,
      'document_uploaded',
      `Document deleted: ${document.document_type} - "${document.original_name}"`,
      req.user.id
    ]);

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/client-documents/stats/:clientId - Get document statistics for a client
router.get('/stats/:clientId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { clientId } = req.params;

    // Get document counts by type
    const typeStats = await db.all(`
      SELECT document_type, COUNT(*) as count, SUM(file_size) as total_size
      FROM client_documents
      WHERE client_id = ?
      GROUP BY document_type
    `, [clientId]);

    const totalDocuments = await db.get(`
      SELECT COUNT(*) as count, SUM(file_size) as total_size
      FROM client_documents
      WHERE client_id = ?
    `, [clientId]);

    const recentDocuments = await db.get(`
      SELECT COUNT(*) as count
      FROM client_documents
      WHERE client_id = ? AND created_at >= date('now', '-30 days')
    `, [clientId]);

    // Check for expiring documents (within 30 days)
    const expiringDocuments = await db.all(`
      SELECT id, document_type, original_name, expiry_date
      FROM client_documents
      WHERE client_id = ? AND expiry_date IS NOT NULL AND expiry_date <= date('now', '+30 days')
      ORDER BY expiry_date ASC
    `, [clientId]);

    res.json({
      success: true,
      data: {
        totalDocuments: totalDocuments.count || 0,
        totalSize: totalDocuments.total_size || 0,
        recentDocuments: recentDocuments.count || 0,
        expiringDocuments,
        byType: typeStats.reduce((acc, item) => {
          acc[item.document_type] = {
            count: item.count,
            totalSize: item.total_size
          };
          return acc;
        }, {})
      }
    });

  } catch (error) {
    console.error('Get document stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router; 