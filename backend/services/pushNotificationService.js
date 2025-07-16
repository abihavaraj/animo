class PushNotificationService {
  async send(user, message) {
    // This is a placeholder for a real push notification service (e.g., Expo Push Notifications)
    console.log(`📱 Sending push notification to ${user.name}: "${message}"`);
    return { success: true };
  }
}

module.exports = new PushNotificationService();
