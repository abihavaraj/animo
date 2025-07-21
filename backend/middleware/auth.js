const jwt = require('jsonwebtoken');
const db = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'pilates_studio_super_secure_jwt_secret_key_2024';

// Verify JWT token
const authenticateToken = async (req, res, next) => {
  console.log('🔍 Auth Debug: authenticateToken middleware hit for:', req.method, req.path);
  
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  console.log('🔍 Auth Debug: authHeader exists:', !!authHeader);
  console.log('🔍 Auth Debug: token exists:', !!token);

  if (!token) {
    console.log('🔍 Auth Debug: No token provided - returning 401');
    return res.status(401).json({ 
      success: false, 
      message: 'Access token required' 
    });
  }

  try {
    let decoded;
    let user;

    if (db.useSupabase) {
      console.log('🔍 Auth Debug: Using Supabase token verification');
      
      // For Supabase mode, verify token using Supabase
      try {
        const { data: { user: supabaseUser }, error } = await db.supabase.auth.getUser(token);
        
        if (error || !supabaseUser) {
          console.log('🔍 Auth Debug: Supabase token verification failed:', error);
          return res.status(401).json({ 
            success: false, 
            message: 'Invalid or expired token' 
          });
        }
        
        console.log('🔍 Auth Debug: Supabase token verified successfully, userId:', supabaseUser.id);
        
        // Map Supabase user to our user format
        user = {
          id: supabaseUser.id,
          name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'User',
          email: supabaseUser.email,
          role: supabaseUser.user_metadata?.role || 'client',
          status: 'active'
        };
        
      } catch (supabaseError) {
        console.log('🔍 Auth Debug: Supabase verification error:', supabaseError);
        return res.status(401).json({ 
          success: false, 
          message: 'Token verification failed' 
        });
      }
      
         } else {
       console.log('🔍 Auth Debug: Attempting to verify legacy JWT token');
       decoded = jwt.verify(token, JWT_SECRET);
       console.log('🔍 Auth Debug: JWT decoded successfully, userId:', decoded.userId);
       
       // Get user from database for legacy JWT tokens
       user = await db.get(
         'SELECT id, name, email, role, status FROM users WHERE id = ? AND status = "active"',
         [decoded.userId]
       );
     }

    console.log('🔍 Auth Debug: Database user lookup result:', user);

    if (!user) {
      console.log('🔍 Auth Debug: User not found or inactive - returning 401');
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token or user not found' 
      });
    }

    console.log('🔍 Auth Debug: Authentication successful for user:', user.name, 'role:', user.role);
    req.user = user;
    next();
  } catch (error) {
    console.log('🔍 Auth Debug: JWT verification failed:', error.message);
    return res.status(403).json({ 
      success: false, 
      message: 'Invalid or expired token' 
    });
  }
};

// Role-based authorization
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Insufficient permissions' 
      });
    }

    next();
  };
};

// Specific role middlewares
const requireAdmin = requireRole(['admin']);
const requireReception = requireRole(['reception', 'admin']);
const requireAdminOrReception = requireRole(['admin', 'reception']);
const requireInstructor = requireRole(['instructor', 'admin', 'reception']);
const requireClient = requireRole(['client', 'instructor', 'admin', 'reception']);

// Check if user can access their own data or is admin
const requireOwnershipOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required' 
    });
  }

  const requestedUserId = parseInt(req.params.userId || req.params.id);
  
  if (req.user.role === 'admin' || req.user.role === 'reception' || req.user.id === requestedUserId) {
    next();
  } else {
    return res.status(403).json({ 
      success: false, 
      message: 'Access denied' 
    });
  }
};

module.exports = {
  authenticateToken,
  requireRole,
  requireAdmin,
  requireReception,
  requireAdminOrReception,
  requireInstructor,
  requireClient,
  requireOwnershipOrAdmin
}; 