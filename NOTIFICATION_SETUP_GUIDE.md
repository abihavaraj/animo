# 🔔 Push Notification Setup Guide

## Overview
The notification system now uses **Supabase + Vercel Cron Jobs** instead of a separate backend.

## Architecture
1. **Frontend** → Stores notifications in Supabase `notifications` table
2. **Manual Trigger** → Call endpoint to send pending notifications
3. **External Cron** → Free service (cron-job.org) calls endpoint every 2 minutes
4. **Expo Push Service** → Delivers notifications to devices

## Required Environment Variables

### Vercel Environment Variables
Add these in your Vercel dashboard (`Settings` → `Environment Variables`):

```bash
# Supabase (same as frontend)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# These should already exist from your frontend setup
```

⚠️ **Important**: Use the **Service Role Key** (not anon key) for the cron job to have full database access.

## How It Works

### 1. Scheduling Notifications
When users book classes, the frontend calls:
```typescript
await pushNotificationService.scheduleClassReminders(userId);
```

This stores notifications in Supabase with:
- `scheduled_for`: When to send (e.g., 30 minutes before class)
- `metadata.push_token`: User's device token
- `sent_at`: null (pending)

### 2. Sending Notifications
Manual trigger or external cron service calls:
- Checks for `sent_at = null` AND `scheduled_for <= now`
- Sends push notifications via Expo
- Marks as sent (`sent_at = timestamp`)

### 3. Notification Types
- **Class Reminders**: 30 minutes before class starts
- **Class Cancellations**: Immediate
- **Subscription Expiring**: Day before expiration

## Deployment Steps

### 1. Deploy to Vercel
```bash
vercel --prod
```

### 2. Set Up External Cron (Free)
1. Go to: https://cron-job.org
2. Create account and add new cron job
3. **URL**: `https://your-app.vercel.app/api/manual-send-notifications`
4. **Schedule**: Every 2 minutes (`*/2 * * * *`)
5. **Method**: GET

### 3. Test Notifications
```bash
# Visit this URL to manually trigger notification processing
https://your-app.vercel.app/api/manual-send-notifications
```

## Monitoring

### Expo Push Dashboard
1. Go to: https://expo.dev/notifications
2. Login with your Expo account
3. View sent notifications and delivery status

### Vercel Function Logs
1. Vercel Dashboard → Functions
2. Click on `send-notifications`
3. View real-time logs

### Supabase Notifications Table
Check the `notifications` table:
- `sent_at = null` → Pending
- `sent_at != null` → Sent
- `is_read = true` → Delivered

## Troubleshooting

### No Notifications Sent
1. **Check Environment Variables**: Verify `SUPABASE_SERVICE_ROLE_KEY` in Vercel
2. **Check Push Tokens**: Ensure users have valid `push_token` in `users` table
3. **Check Cron Schedule**: Verify cron is running in Vercel dashboard

### Invalid Push Tokens
```sql
-- Find users with invalid push tokens
SELECT id, name, email, push_token 
FROM users 
WHERE push_token IS NOT NULL 
AND push_token NOT LIKE 'ExponentPushToken[%]';
```

### Test Notification Manually
```sql
-- Insert a test notification
INSERT INTO notifications (
  user_id, 
  title, 
  message, 
  type, 
  scheduled_for, 
  metadata,
  is_read,
  sent_at
) VALUES (
  'your-user-id',
  'Test Notification',
  'This is a test push notification',
  'test',
  NOW(),
  '{"push_token": "ExponentPushToken[your-token]"}',
  false,
  null
);
```

## Next Steps
1. Deploy to Vercel with the new cron configuration
2. Set up environment variables
3. Test with a real booking
4. Monitor in Expo dashboard

## FAQ

**Q: Why every 2 minutes?**
A: More frequent than needed but ensures timely delivery. Can be adjusted in `vercel.json`.

**Q: What if Vercel cron fails?**
A: Notifications remain in database and will be processed on next successful run.

**Q: How to disable notifications for a user?**
A: Set `push_token = null` in the `users` table.