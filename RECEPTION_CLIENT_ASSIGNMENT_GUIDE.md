# Reception Client Assignment Guide

## 🎯 Overview

The reception portal now includes the ability for reception staff to assign clients to classes directly. This feature allows reception users to bypass normal booking restrictions and manually assign clients to classes, making it easier to manage client bookings and handle special cases.

## ✨ New Features

### 🔧 Backend API
- **New Endpoint**: `POST /api/bookings/reception-assign`
- **Access**: Admin and Reception roles only
- **Functionality**: Assign clients to classes with optional restriction overrides

### 🖥️ Frontend Interface
- **New Button**: "Assign Client" button on class cards and table rows
- **Modal Interface**: Client selection with search functionality
- **Override Options**: Bypass subscription restrictions when needed
- **Notes Support**: Add notes for assignment tracking

## 🚀 How to Use

### For Reception Staff

1. **Navigate to Class Management**
   - Login as reception user
   - Go to "Classes" tab in reception portal

2. **Find the Class**
   - Use calendar view or table view
   - Look for the "Assign Client" button (👤 icon)

3. **Assign Client**
   - Click the "Assign Client" button
   - Select a client from the dropdown
   - Add optional notes
   - Choose whether to override restrictions
   - Click "Assign Client"

### Assignment Options

#### ✅ Normal Assignment
- Respects client's subscription restrictions
- Checks for remaining classes
- Validates equipment access
- Validates personal/group class restrictions

#### ⚡ Override Restrictions
- Bypass subscription requirements
- Assign clients without active subscriptions
- Override equipment access restrictions
- Override personal/group class restrictions

## 🔍 Technical Details

### API Parameters
```json
{
  "userId": 123,           // Client ID (required)
  "classId": 456,          // Class ID (required)
  "notes": "Optional notes", // Assignment notes (optional)
  "overrideRestrictions": false // Override restrictions (optional)
}
```

### Response Types
- **Success**: Client assigned to class
- **Waitlist**: Class is full, client added to waitlist
- **Error**: Various validation errors with clear messages

### Activity Logging
- All assignments are logged in `client_activity_log`
- Includes performer information and notes
- Tracks both successful assignments and waitlist additions

## 🛡️ Security & Validation

### Role-Based Access
- Only Admin and Reception users can access this feature
- Uses `requireAdminOrReception` middleware

### Validation Checks
- ✅ Class exists and is active
- ✅ Client exists and has client role
- ✅ Class is in the future
- ✅ Client doesn't already have a booking
- ✅ Class capacity (unless overriding)

### Restriction Checks (when not overriding)
- ✅ Client has active subscription
- ✅ Subscription has remaining classes
- ✅ Equipment access matches class type
- ✅ Personal/group class restrictions

## 📊 Business Benefits

### For Reception Staff
- **Quick Client Management**: Assign clients to classes without them needing to book themselves
- **Special Cases**: Handle clients who can't book online
- **Override Capability**: Manage exceptions and special circumstances
- **Activity Tracking**: All assignments are logged for accountability

### For Studio Operations
- **Flexibility**: Handle walk-ins and phone bookings
- **Client Service**: Better customer service for clients who need assistance
- **Override Control**: Manage special cases while maintaining normal booking rules
- **Audit Trail**: Complete tracking of all manual assignments

## 🎨 UI Features

### Class Management Interface
- **Visual Indicators**: Assign button with clear icon
- **Modal Design**: Clean, professional interface
- **Search Functionality**: Find clients quickly
- **Status Feedback**: Clear success/error messages

### Client Selection
- **Dropdown Menu**: Easy client selection
- **Search Filter**: Find clients by name or email
- **Client Info**: Shows client details for verification

### Assignment Options
- **Notes Field**: Add context for assignments
- **Override Toggle**: Clear option to bypass restrictions
- **Confirmation**: Clear assignment confirmation

## 🔧 Testing

### Backend Testing
```bash
cd backend
node test_client_assignment.js
```

### Frontend Testing
1. Login as reception user
2. Navigate to Class Management
3. Find a class and click "Assign Client"
4. Select a client and complete assignment
5. Verify assignment appears in bookings

## 📝 Usage Examples

### Example 1: Normal Assignment
- Client has active subscription with remaining classes
- Reception assigns them to appropriate class
- Assignment respects all normal restrictions

### Example 2: Override Assignment
- New client without subscription
- Reception overrides restrictions to assign them
- Client gets assigned despite no subscription

### Example 3: Waitlist Assignment
- Class is full but reception wants to add client
- Client gets added to waitlist automatically
- Position in waitlist is tracked

## 🎯 Future Enhancements

### Potential Improvements
- **Bulk Assignment**: Assign multiple clients at once
- **Template Assignments**: Save common assignment patterns
- **Advanced Overrides**: More granular override options
- **Assignment History**: View all assignments by reception staff

### Integration Opportunities
- **Notification System**: Notify clients of assignments
- **Payment Integration**: Handle payment for assignments
- **Reporting**: Assignment analytics and reporting

## ✅ Implementation Status

- ✅ Backend API endpoint
- ✅ Frontend modal interface
- ✅ Client selection with search
- ✅ Override functionality
- ✅ Activity logging
- ✅ Security validation
- ✅ Error handling
- ✅ UI integration

The reception client assignment feature is now **fully implemented** and ready for use! 