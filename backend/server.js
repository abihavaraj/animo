require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./config/database');
const notificationScheduler = require('./services/notificationScheduler');
const subscriptionNotificationService = require('./services/subscriptionNotificationService');
const expireSubscriptions = require('./middleware/expireSubscriptions');
const cron = require('node-cron');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const planRoutes = require('./routes/plans');
const classRoutes = require('./routes/classes');
const bookingRoutes = require('./routes/bookings');
const subscriptionRoutes = require('./routes/subscriptions');
const notificationRoutes = require('./routes/notifications');
const paymentRoutes = require('./routes/payments');
const paymentSettingsRoutes = require('./routes/paymentSettings');
const manualCreditsRoutes = require('./routes/manualCredits');

// Import advanced client management routes
const clientNotesRoutes = require('./routes/clientNotes');
const clientDocumentsRoutes = require('./routes/clientDocuments');
const clientActivityRoutes = require('./routes/clientActivity');
const clientLifecycleRoutes = require('./routes/clientLifecycle');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [
    'http://localhost:8081',
    'http://localhost:19006',
    'http://localhost:3000',
    'http://172.20.16.47:8081',
    'http://172.20.16.47:19006',
    'http://192.168.100.37:8081',
    'http://192.168.100.37:19006',
    'https://animo-pilates-studio.vercel.app' // <-- Added Vercel domain
  ],
  credentials: true
}));

// Increased limits for file uploads
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Automatically expire subscriptions middleware - runs globally
app.use(expireSubscriptions);

// Serve static files for document uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Pilates Studio API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/user', userRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/payment-settings', paymentSettingsRoutes);
app.use('/api/manual-credits', manualCreditsRoutes);

// Advanced Client Management Routes
app.use('/api/client-notes', clientNotesRoutes);
app.use('/api/client-documents', clientDocumentsRoutes);
app.use('/api/client-activity', clientActivityRoutes);
app.use('/api/client-lifecycle', clientLifecycleRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Handle multer errors (file upload)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File too large. Maximum size is 10MB.'
    });
  }
  
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      message: 'Unexpected file field.'
    });
  }

  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Initialize database and start server
const startServer = async () => {
  try {
    // Connect to database
    await db.connect();
    console.log('✅ Database connected successfully');

    // Start notification scheduler
    notificationScheduler.start();
    
    // Start subscription notification service
    subscriptionNotificationService.start();

    // Start server
    const server = app.listen(PORT, () => {
      console.log(`🚀 Pilates Studio API running on port ${PORT}`);
      console.log(`📱 Health check: http://localhost:${PORT}/health`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Schedule daily expiration check at midnight
    cron.schedule('0 0 * * *', async () => {
      try {
        const result = await db.run('UPDATE user_subscriptions SET status = \'expired\', updated_at = CURRENT_TIMESTAMP WHERE status = \'active\' AND DATE(end_date) < DATE(\'now\')');
        if (result.changes > 0) {
          console.log(`🔄 Auto-expired ${result.changes} subscriptions`);
        }
      } catch (error) {
        console.error('❌ Error in daily expiration cron:', error);
      }
    });
    console.log('⏰ Daily subscription expiration scheduler started');

    // Graceful shutdown handlers
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down server...');
      server.close(async () => {
        try {
          notificationScheduler.stop();
          subscriptionNotificationService.stop();
          await db.close();
          console.log('✅ Database connection closed');
          process.exit(0);
        } catch (error) {
          console.error('❌ Error during shutdown:', error);
          process.exit(1);
        }
      });
    });

    process.on('SIGTERM', async () => {
      console.log('\n🛑 Shutting down server...');
      server.close(async () => {
        try {
          notificationScheduler.stop();
          subscriptionNotificationService.stop();
          await db.close();
          console.log('✅ Database connection closed');
          process.exit(0);
        } catch (error) {
          console.error('❌ Error during shutdown:', error);
          process.exit(1);
        }
      });
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer(); 