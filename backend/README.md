# Pilates Studio Backend API

A comprehensive REST API backend system for managing a Pilates studio with subscription-based class booking, user management, and real-time studio operations. Built with Express.js, SQLite, and JWT authentication.

## 🚀 Features

### Core Functionality
- **Authentication & Authorization** - JWT-based auth with role-based access control (Admin, Instructor, Client)
- **Subscription Management** - Monthly plans with equipment-based access control and automatic upgrades
- **Class Booking System** - Real-time booking with capacity management, waitlists, and equipment validation
- **User Management** - Multi-role system with profile management and medical information tracking
- **Payment Tracking** - Subscription payment history, revenue analytics, and automated billing
- **Equipment-Based Access** - Mat, Reformer, or Both access levels with subscription validation

### Business Logic
- **Subscription-Based Model** - Access through monthly subscriptions with flexible upgrade paths
- **Equipment Access Control** - Users can only book classes their subscription tier allows
- **Class Deduction System** - Each booking reduces monthly class allowance with rollover handling
- **Waitlist Management** - Automatic promotion when spots become available with position tracking
- **Cancellation Policy** - 2-hour cancellation window with automatic class refunds
- **Admin Override** - Administrative controls for booking management and user assistance

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 16+ 
- npm or yarn
- SQLite3 (included with Node.js)

### Quick Installation

1. **Navigate to Backend Directory**
   ```bash
   cd backend
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Create Environment File**
   ```bash
   # Create .env file
   cp .env.example .env
   ```

4. **Initialize Database**
   ```bash
   # Create database with schema
   npm run init-db
   ```

5. **Seed Sample Data**
   ```bash
   # Add demo users, plans, and classes
   npm run seed-db
   ```

6. **Start Development Server**
   ```bash
   # Start with auto-reload
   npm run dev
   
   # Or start production mode
   npm start
   ```

The API will be available at `http://localhost:3000`

### Environment Configuration

Create a `.env` file in the backend directory:
```env
# Server Configuration
NODE_ENV=development
PORT=3000

# JWT Configuration  
JWT_SECRET=pilates_studio_secret_key_2024_change_in_production
JWT_EXPIRES_IN=7d

# Database Configuration
DB_PATH=./database/pilates_studio.db

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:8081,http://localhost:19006,http://localhost:3000

# Optional: Logging Configuration
LOG_LEVEL=info
```

### Available Scripts

```bash
# Development with auto-reload
npm run dev

# Production start
npm start

# Database operations
npm run init-db      # Initialize database schema
npm run seed-db      # Seed with sample data
npm run reset-db     # Reset and reseed database

# Testing and maintenance
npm test            # Run test suite (if implemented)
npm run lint        # Run linting
npm run build       # Build for production
```

## 📋 Database Schema

### Core Tables

#### `users`
```sql
- id: INTEGER PRIMARY KEY
- name: TEXT NOT NULL
- email: TEXT UNIQUE NOT NULL  
- password: TEXT NOT NULL (bcrypt hashed)
- phone: TEXT
- role: TEXT ('client'|'instructor'|'admin')
- emergency_contact: TEXT
- medical_conditions: TEXT
- join_date: DATE DEFAULT CURRENT_DATE
- status: TEXT ('active'|'inactive'|'suspended') DEFAULT 'active'
- created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- updated_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

#### `subscription_plans`
```sql
- id: INTEGER PRIMARY KEY
- name: TEXT NOT NULL
- monthly_classes: INTEGER NOT NULL
- monthly_price: DECIMAL(10,2) NOT NULL
- equipment_access: TEXT ('mat'|'reformer'|'both')
- category: TEXT ('trial'|'basic'|'standard'|'premium'|'unlimited'|'personal'|'special')
- description: TEXT
- features: TEXT (JSON array)
- is_active: BOOLEAN DEFAULT 1
- created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

#### `user_subscriptions`
```sql
- id: INTEGER PRIMARY KEY
- user_id: INTEGER FOREIGN KEY → users.id
- plan_id: INTEGER FOREIGN KEY → subscription_plans.id
- remaining_classes: INTEGER
- start_date: DATE NOT NULL
- end_date: DATE NOT NULL
- status: TEXT ('active'|'expired'|'cancelled') DEFAULT 'active'
- created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- updated_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

#### `classes`
```sql
- id: INTEGER PRIMARY KEY
- name: TEXT NOT NULL
- instructor_id: INTEGER FOREIGN KEY → users.id
- date: DATE NOT NULL
- time: TIME NOT NULL
- duration: INTEGER (minutes)
- level: TEXT ('Beginner'|'Intermediate'|'Advanced'|'All Levels')
- capacity: INTEGER NOT NULL
- current_bookings: INTEGER DEFAULT 0
- equipment_type: TEXT ('mat'|'reformer'|'both')
- equipment: TEXT (JSON array)
- description: TEXT
- status: TEXT ('scheduled'|'cancelled'|'completed') DEFAULT 'scheduled'
- created_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

#### `bookings`
```sql
- id: INTEGER PRIMARY KEY
- user_id: INTEGER FOREIGN KEY → users.id
- class_id: INTEGER FOREIGN KEY → classes.id
- subscription_id: INTEGER FOREIGN KEY → user_subscriptions.id
- status: TEXT ('confirmed'|'cancelled'|'completed'|'no_show') DEFAULT 'confirmed'
- booking_time: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- checkin_time: TIMESTAMP
- cancellation_time: TIMESTAMP
- notes: TEXT
```

#### `waitlist`
```sql
- id: INTEGER PRIMARY KEY
- user_id: INTEGER FOREIGN KEY → users.id
- class_id: INTEGER FOREIGN KEY → classes.id
- position: INTEGER NOT NULL
- joined_at: TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- status: TEXT ('waiting'|'promoted'|'cancelled') DEFAULT 'waiting'
```

#### `payments`
```sql
- id: INTEGER PRIMARY KEY
- user_id: INTEGER FOREIGN KEY → users.id
- subscription_id: INTEGER FOREIGN KEY → user_subscriptions.id
- amount: DECIMAL(10,2) NOT NULL
- payment_date: DATE NOT NULL
- payment_method: TEXT ('card'|'cash'|'bank_transfer'|'other')
- status: TEXT ('completed'|'pending'|'failed'|'refunded') DEFAULT 'completed'
- transaction_id: TEXT
- notes: TEXT
```

## 📚 API Documentation

### Authentication

All protected endpoints require JWT token in Authorization header:
```
Authorization: Bearer <jwt_token>
```

#### POST `/api/auth/register`
Register a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "+1-555-0123",
  "role": "client",
  "emergencyContact": "Jane Doe: +1-555-0124",
  "medicalConditions": "Lower back issues"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {...},
    "token": "jwt_token_here"
  }
}
```

#### POST `/api/auth/login`
Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "role": "client"
    },
    "token": "jwt_token_here"
  }
}
```

#### GET `/api/auth/me`
Get current user profile with active subscription.

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {...},
    "subscription": {...}
  }
}
```

### Subscription Plans

#### GET `/api/plans`
Get all available subscription plans.

**Query Parameters:**
- `category` - Filter by plan category
- `equipmentAccess` - Filter by equipment access type
- `active` - Filter by active status (default: true)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Mat Starter",
      "monthly_classes": 4,
      "monthly_price": 89.00,
      "equipment_access": "mat",
      "category": "basic",
      "description": "Perfect for beginners",
      "features": ["4 Mat Classes per Month", "Beginner-Friendly"],
      "is_active": true
    }
  ]
}
```

#### POST `/api/plans` *(Admin only)*
Create new subscription plan.

**Request Body:**
```json
{
  "name": "Premium Plan",
  "monthly_classes": 20,
  "monthly_price": 299.00,
  "equipment_access": "both",
  "category": "premium",
  "description": "Full studio access",
  "features": ["20 Classes per Month", "All Equipment Access"]
}
```

#### PUT `/api/plans/:id` *(Admin only)*
Update subscription plan.

#### DELETE `/api/plans/:id` *(Admin only)*
Delete subscription plan (soft delete).

### User Subscriptions

#### GET `/api/subscriptions/current`
Get user's current active subscription.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "plan_name": "Mat Starter",
    "remaining_classes": 3,
    "start_date": "2024-01-01",
    "end_date": "2024-02-01",
    "equipment_access": "mat",
    "monthly_price": 89.00
  }
}
```

#### POST `/api/subscriptions/purchase`
Purchase a new subscription plan. Automatically cancels existing active subscription.

**Request Body:**
```json
{
  "planId": 1,
  "paymentMethod": "card"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Subscription purchased successfully", // or "upgraded"
  "data": {...}
}
```

#### PUT `/api/subscriptions/:id/cancel`
Cancel active subscription.

#### PUT `/api/subscriptions/:id/renew`
Renew expired subscription.

### Classes

#### GET `/api/classes`
Get available classes with filters.

**Query Parameters:**
- `date` - Filter by specific date (YYYY-MM-DD)
- `instructor` - Filter by instructor ID
- `level` - Filter by difficulty level
- `equipmentType` - Filter by equipment type
- `status` - Filter by class status
- `upcoming` - Show only upcoming classes (boolean)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Morning Mat Flow",
      "instructor_name": "Sarah Wilson",
      "date": "2024-01-15",
      "time": "09:00",
      "duration": 60,
      "level": "Beginner",
      "capacity": 15,
      "current_bookings": 8,
      "available_spots": 7,
      "equipment_type": "mat",
      "equipment": ["Mat", "Magic Circle"],
      "description": "Energizing morning flow",
      "can_book": true,
      "waitlist_count": 0
    }
  ]
}
```

#### POST `/api/classes` *(Admin only)*
Create new class.

**Request Body:**
```json
{
  "name": "Evening Power Flow",
  "instructorId": 2,
  "date": "2024-01-15",
  "time": "19:00",
  "duration": 60,
  "level": "Intermediate",
  "capacity": 12,
  "equipmentType": "reformer",
  "equipment": ["Reformer", "Spring System"],
  "description": "High-energy evening class"
}
```

#### PUT `/api/classes/:id` *(Admin only)*
Update class details.

#### DELETE `/api/classes/:id` *(Admin only)*
Cancel class (updates status to 'cancelled').

### Bookings

#### POST `/api/bookings`
Book a class. Requires active subscription with valid equipment access.

**Request Body:**
```json
{
  "classId": 1
}
```

**Response:**
```json
{
  "success": true,
  "message": "Class booked successfully",
  "data": {
    "booking": {...},
    "remaining_classes": 7
  }
}
```

#### PUT `/api/bookings/:id/cancel`
Cancel booking. Must be >2 hours before class start time.

**Response:**
```json
{
  "success": true,
  "message": "Booking cancelled successfully",
  "data": {
    "refunded_class": true,
    "remaining_classes": 8
  }
}
```

#### PUT `/api/bookings/:id/checkin` *(Instructor/Admin)*
Check user into class.

#### GET `/api/bookings/class/:classId/attendees` *(Instructor/Admin)*
Get class attendance list.

**Response:**
```json
{
  "success": true,
  "data": {
    "class_info": {...},
    "attendees": [
      {
        "user_name": "John Doe",
        "booking_status": "confirmed",
        "checkin_time": null,
        "medical_conditions": "Lower back issues"
      }
    ],
    "waitlist": [...]
  }
}
```

### Waitlist

#### POST `/api/bookings/waitlist`
Join waitlist for full class.

**Request Body:**
```json
{
  "classId": 1
}
```

#### PUT `/api/bookings/waitlist/:id/cancel`
Leave waitlist.

#### GET `/api/bookings/class/:classId/waitlist` *(Instructor/Admin)*
Get class waitlist.

### User Management

#### GET `/api/users` *(Admin only)*
Get all users with filters.

**Query Parameters:**
- `role` - Filter by user role
- `status` - Filter by account status
- `search` - Search by name or email

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "role": "client",
      "status": "active",
      "join_date": "2024-01-01",
      "currentSubscription": {...}
    }
  ]
}
```

#### GET `/api/users/stats` *(Admin only)*
Get user and subscription statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 150,
    "clients": 120,
    "instructors": 8,
    "activeUsers": 145,
    "recentUsers": 12,
    "activeSubscriptions": 95,
    "monthlyRevenue": 8500.00
  }
}
```

#### POST `/api/users` *(Admin only)*
Create new user account.

#### PUT `/api/users/:id` *(Admin only)*
Update user information.

#### PUT `/api/users/:id/password` *(Admin only)*
Reset user password.

#### DELETE `/api/users/:id` *(Admin only)*
Delete user account (with validation for active bookings).

### Instructors

#### GET `/api/users/instructors/list`
Get list of active instructors.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 2,
      "name": "Sarah Wilson",
      "email": "sarah@pilatesstudio.com",
      "phone": "+1-555-0101"
    }
  ]
}
```

## 🔐 Security Features

### Authentication & Authorization
- **JWT Tokens**: Secure token-based authentication with configurable expiration
- **Password Security**: bcrypt hashing with salt rounds for password storage
- **Role-Based Access**: Three-tier permission system (Client, Instructor, Admin)
- **Route Protection**: Middleware validation for protected endpoints
- **Token Validation**: Automatic token validation and user context injection

### Data Security
- **Input Validation**: Express-validator for all API inputs with sanitization
- **SQL Injection Prevention**: Parameterized queries throughout the application
- **CORS Protection**: Configurable origins for cross-origin requests
- **Rate Limiting**: Built-in protection against request spam (if implemented)
- **Data Sanitization**: Automatic data cleaning and validation

### Business Logic Security
- **Subscription Validation**: Equipment access validation before booking
- **Class Capacity**: Real-time capacity management with atomic operations
- **Cancellation Policy**: Time-based cancellation rules with automatic enforcement
- **Admin Controls**: Override capabilities for administrative management

## 🐛 Recent Bug Fixes & Improvements

### Critical Fixes Applied
- ✅ **Subscription Upgrade Blocking**: Fixed issue where users couldn't purchase new subscriptions
  - Problem: Backend rejected purchases for users with existing active subscriptions
  - Solution: Automatic cancellation of existing subscription before creating new one
  - Result: Seamless subscription upgrades with contextual success messages

- ✅ **API Response Handling**: Fixed double data extraction in frontend service
  - Problem: `userService.getUsers()` looking for `response.data.data` when data was already extracted
  - Solution: Updated service methods to properly access `response.data`
  - Result: Admin user management now displays all users correctly

- ✅ **Plan Validation**: Updated subscription plan validation to accept all categories
  - Problem: Backend only accepted 4 categories, frontend supported 7
  - Solution: Updated validation to accept: `['trial', 'basic', 'standard', 'premium', 'unlimited', 'personal', 'special']`
  - Result: Admin can create plans in all supported categories

- ✅ **Redux Integration**: Fixed subscription plan management in admin panel
  - Problem: Admin component only updated local state, never persisted to database
  - Solution: Proper Redux actions with API integration
  - Result: Admin-created plans persist correctly and appear in client view

### Performance Improvements
- ✅ **Database Transactions**: Atomic operations for subscription purchases
- ✅ **Error Handling**: Comprehensive error messages and validation feedback
- ✅ **Logging Optimization**: Reduced console spam while maintaining debugging capability
- ✅ **Query Optimization**: Efficient database queries with proper indexing

### Data Integrity
- ✅ **Safe Array Handling**: Protected against undefined array operations
- ✅ **Null Check Validation**: Comprehensive null/undefined validation throughout
- ✅ **Foreign Key Constraints**: Proper database relationships with constraint validation
- ✅ **Status Management**: Consistent status tracking across all entities

## 🚀 Deployment

### Production Setup

1. **Environment Configuration**
   ```bash
   # Set production environment variables
   NODE_ENV=production
   PORT=3000
   JWT_SECRET=your_super_secure_production_secret
   DB_PATH=/path/to/production/database.db
   ```

2. **Database Migration**
   ```bash
   # Initialize production database
   NODE_ENV=production npm run init-db
   
   # Import production data
   NODE_ENV=production npm run seed-db
   ```

3. **Start Production Server**
   ```bash
   # Install production dependencies only
   npm ci --production
   
   # Start with process manager
   pm2 start app.js --name pilates-api
   ```

### Docker Deployment

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Health Monitoring

```bash
# Check server status
curl http://localhost:3000/api/auth/me

# Monitor database
npm run db-check

# View logs
pm2 logs pilates-api
```

## 📊 API Response Format

### Success Response
```json
{
  "success": true,
  "data": <response_data>,
  "message": "Optional success message"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error information",
  "errors": [] // Validation errors array if applicable
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate data)
- `500` - Internal Server Error

## 🧪 Testing

### API Testing with curl

```bash
# Login and get token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pilatesstudio.com","password":"password123"}' \
  | jq -r '.data.token')

# Test protected endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/users
```

### Database Testing

```bash
# Check database integrity
npm run db-check

# Reset test database
npm run reset-db

# Run seeding
npm run seed-db
```

## 📈 Performance Monitoring

### Key Metrics
- Response time for API endpoints
- Database query performance
- Memory usage and leaks
- Concurrent user handling
- Error rates and types

### Logging
```javascript
// Enable detailed logging
LOG_LEVEL=debug npm run dev

// Production logging
LOG_LEVEL=info npm start
```

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create feature branch: `git checkout -b feature/api-enhancement`
3. Install dependencies: `npm install`
4. Set up test database: `npm run init-db && npm run seed-db`
5. Start development server: `npm run dev`
6. Run tests: `npm test`
7. Submit pull request

### API Development Guidelines
- Follow RESTful conventions
- Implement proper error handling
- Add input validation for all endpoints
- Include proper authorization checks
- Write comprehensive API documentation
- Add unit tests for new endpoints

### Code Style
- Use TypeScript for type safety
- Follow ESLint configuration
- Use meaningful variable names
- Add JSDoc comments for complex functions
- Implement proper error handling patterns

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

## 🆘 Support

For API support and questions:
- Create an issue in the repository
- Check the [main README](../README.md) for full system documentation
- Contact the development team
- Review the API documentation above

---

**Built with ❤️ for efficient studio management**

*Providing a robust backend foundation for the Pilates Studio Management System.* 