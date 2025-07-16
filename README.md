# ANIMO Pilates Studio Management System

A comprehensive full-stack React Native application for managing ANIMO Pilates Studio with subscription-based class booking, user management, and real-time studio operations. Built with React Native, Express.js, and SQLite with beautiful ANIMO branding.

## 🚀 Features

### 🏃‍♀️ Client Portal
- **Dashboard**: Personalized welcome screen with upcoming classes, subscription status, and quick stats
- **Subscription Management**: View current plan, purchase new subscriptions, and upgrade plans
- **Class Booking**: Browse and book available pilates classes with real-time capacity tracking
- **Waitlist System**: Join waitlists for full classes with automatic promotion
- **Booking History**: View past and upcoming bookings with status tracking
- **Profile Management**: Update personal information, emergency contacts, and medical conditions
- **Equipment Access Control**: Only book classes your subscription allows (Mat, Reformer, or Both)

### 👨‍🏫 Instructor Portal
- **Class Management**: View and manage assigned classes with attendance tracking
- **Schedule Overview**: Weekly/monthly schedule view with class details
- **Student Roster**: Access to class participant lists and waitlists
- **Attendance Tracking**: Check-in students and mark attendance/no-shows
- **Profile Management**: Manage instructor profile and certifications

### 👨‍💼 Admin Portal
- **Studio Dashboard**: Overview of studio performance, revenue, and key metrics
- **User Management**: Create, edit, and manage clients and instructors with role-based controls
- **Subscription Plans**: Create and manage subscription plans with flexible pricing and features
- **Class Management**: Create, edit, and cancel classes with instructor assignment
- **Booking Management**: View all bookings, manage waitlists, and handle cancellations
- **Reports & Analytics**: Revenue tracking, attendance reports, and user statistics
- **System Settings**: Configure studio settings, policies, and operational parameters

## 🏗️ Technology Stack

### Frontend
- **Framework**: React Native with Expo
- **State Management**: Redux Toolkit with persistent storage
- **Navigation**: React Navigation v6 with role-based routing
- **UI Components**: React Native Paper (Material Design)
- **Icons**: Material Icons (@expo/vector-icons)
- **Styling**: Linear gradients, responsive design
- **TypeScript**: Full type safety throughout

### Backend
- **Framework**: Express.js with TypeScript
- **Database**: SQLite with automated schema management
- **Authentication**: JWT-based auth with role-based access control
- **Validation**: Express-validator for API input validation
- **Security**: CORS, bcrypt password hashing, middleware protection
- **API Design**: RESTful endpoints with consistent response format

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator (for iOS development) or Android Studio (for Android development)

### Full System Installation

1. **Clone and navigate to the project**:
   ```bash
   git clone <repository-url>
   cd PilatesStudioApp
   ```

2. **Setup Backend**:
   ```bash
   cd backend
   npm install
   
   # Initialize database with schema
   npm run init-db
   
   # Seed with sample data
   npm run seed-db
   
   # Start backend server
   npm run dev
   ```

3. **Setup Frontend** (in new terminal):
   ```bash
   cd .. # Back to root directory
   npm install
   
   # Start Expo development server
   npm start
   ```

4. **Run on your platform**:
   - **iOS**: `npm run ios` (requires macOS)
   - **Android**: `npm run android`
   - **Web**: `npm run web`

### Environment Configuration

Create `.env` file in backend directory:
```env
NODE_ENV=development
PORT=3000
JWT_SECRET=pilates_studio_secret_key_2024
JWT_EXPIRES_IN=7d
DB_PATH=./database/pilates_studio.db
ALLOWED_ORIGINS=http://localhost:8081,http://localhost:19006
```

### Demo Accounts

The app includes seeded demo accounts for testing:

#### Admin Account
- **Email**: `admin@pilatesstudio.com`
- **Password**: `password123`
- **Features**: Full system access, user management, analytics

#### Instructor Account
- **Email**: `sarah@pilatesstudio.com`
- **Password**: `password123`
- **Features**: Class management, attendance tracking

#### Client Accounts
- **Email**: `jennifer@example.com`
- **Password**: `password123`
- **Subscription**: Mat Starter Plan
- **Features**: Class booking, subscription management

## 📁 Project Structure

```
PilatesStudioApp/
├── src/                     # Frontend React Native code
│   ├── components/          # Reusable UI components
│   ├── navigation/          # Navigation configuration
│   │   ├── AuthNavigator.tsx
│   │   ├── MainNavigator.tsx
│   │   ├── ClientNavigator.tsx
│   │   ├── InstructorNavigator.tsx
│   │   └── AdminNavigator.tsx
│   ├── screens/            # Screen components
│   │   ├── auth/           # Authentication screens
│   │   ├── client/         # Client-specific screens
│   │   ├── instructor/     # Instructor-specific screens
│   │   ├── admin/          # Admin-specific screens
│   │   └── shared/         # Shared screens
│   ├── services/           # API services and business logic
│   │   ├── api.ts          # Core API service
│   │   ├── authService.ts  # Authentication
│   │   ├── userService.ts  # User management
│   │   └── classService.ts # Class booking
│   ├── store/              # Redux store configuration
│   │   ├── slices/         # Redux slices
│   │   └── index.ts        # Store configuration
│   ├── types/              # TypeScript type definitions
│   └── utils/              # Utility functions
├── backend/                # Backend Express.js API
│   ├── routes/             # API route handlers
│   ├── middleware/         # Authentication & validation
│   ├── config/             # Database and app configuration
│   ├── scripts/            # Database initialization scripts
│   └── database/           # SQLite database file
└── docs/                   # Additional documentation
```

## 🔧 Key Features Implementation

### Authentication & Authorization
- JWT-based authentication with secure token management
- Role-based access control (Admin, Instructor, Client)
- Persistent authentication state with Redux
- Protected routes and API endpoints

### Subscription System
- Monthly subscription plans with equipment-based access
- Automatic subscription cancellation when upgrading
- Remaining class tracking and usage analytics
- Payment history and revenue tracking

### Class Booking & Management
- Real-time booking with capacity management
- Equipment access validation (Mat/Reformer/Both)
- Waitlist system with automatic promotion
- 2-hour cancellation policy with class refunds
- Instructor assignment and scheduling

### User Management
- Multi-role user system with different permissions
- Profile management with emergency contacts
- Medical conditions and fitness goals tracking
- User creation, editing, and status management

## 🐛 Recent Bug Fixes

### Fixed Issues
- ✅ **Waitlist Error**: Fixed "waitlist.some is not a function" error with safe array handling
- ✅ **API Response Handling**: Fixed double data extraction causing "Failed to fetch users"
- ✅ **Subscription Plans**: Fixed admin-created plans not persisting to database
- ✅ **Plan Validation**: Updated backend validation to accept all plan categories
- ✅ **Subscription Blocking**: Fixed blocking when user already has active subscription
- ✅ **Redux Integration**: Proper Redux actions for subscription plan management

### Performance Improvements
- ✅ Reduced logging frequency to prevent console spam
- ✅ Safe array handling throughout the application
- ✅ Optimized API calls with proper error handling
- ✅ Enhanced user feedback with loading states

## 🧪 Testing

### Testing Different User Roles

1. **Admin Testing**:
   - Login with admin account
   - Create subscription plans
   - Manage users and classes
   - View analytics and reports

2. **Instructor Testing**:
   - Login with instructor account
   - View assigned classes
   - Check-in students
   - Manage class attendance

3. **Client Testing**:
   - Login with client account
   - Purchase subscriptions
   - Book classes within subscription limits
   - Join waitlists for full classes

### Development Testing

Run the app using Expo Go:
1. Install Expo Go on your mobile device
2. Start development server: `npm start`
3. Scan QR code from terminal
4. Test different user flows

## 🚀 Deployment

### Backend Deployment
```bash
cd backend
npm run build
npm start
```

### Frontend Deployment
```bash
# Build for production
expo build:android
expo build:ios

# Or publish to Expo
expo publish
```

## 🔮 Future Enhancements

### Short Term
- [ ] Push notifications for class reminders and cancellations
- [ ] Email notifications for booking confirmations
- [ ] Advanced filtering and search capabilities
- [ ] Bulk operations for admin users

### Medium Term
- [ ] Payment integration (Stripe/PayPal)
- [ ] Calendar synchronization (Google/Apple Calendar)
- [ ] Mobile app store deployment
- [ ] Multi-studio support

### Long Term
- [ ] Video class streaming capabilities
- [ ] Wearable device integration
- [ ] Social features and community building
- [ ] Advanced reporting and business intelligence
- [ ] Multi-language support
- [ ] Dark mode theme

## 📖 Documentation

- [Backend API Documentation](./backend/README.md)
- [Database Schema Documentation](./docs/database-schema.md)
- [Deployment Guide](./docs/deployment.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript strict mode
- Use React Native Paper components for UI consistency
- Implement proper error handling and loading states
- Add proper type definitions for all new features
- Test on both iOS and Android platforms

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation in the `/docs` folder

## 🙏 Acknowledgments

- React Native and Expo communities
- Material Design team for UI guidelines
- Contributors and testers

---

**Built with ❤️ for the pilates community**

*Empowering studios to manage their operations efficiently while providing clients with seamless booking experiences.*
