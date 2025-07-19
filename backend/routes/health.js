const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.get('/', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Test database connection
    const dbStart = Date.now();
    await db.get('SELECT 1 as test');
    const dbLatency = Date.now() - dbStart;
    
    const totalLatency = Date.now() - startTime;
    
    res.json({
      success: true,
      message: 'Pilates Studio API is running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      performance: {
        totalLatency,
        databaseLatency: dbLatency,
        serverLatency: totalLatency - dbLatency
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: '1.0.0'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router; 