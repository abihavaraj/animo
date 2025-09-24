// Server-side notification translation utility
// This can be used in Vercel functions to send translated notifications

// Translation dictionaries (server-side compatible)
const translations = {
  en: {
    waitlistJoinedTitle: "Added to waitlist!",
    waitlistJoinedBody: "You've been added to the waitlist for {{className}} on {{date}} at {{time}}. Your position: #{{position}}",
    classAssignmentTitle: "New class assignment!",
    classAssignmentBody: "You've been assigned to {{className}} with {{instructorName}} on {{date}} at {{time}}.",
    classBookedTitle: "Class booked!",
    classBookedBody: "Your booking for {{className}} with {{instructorName}} is confirmed for {{date}} at {{time}}.",
    classCancelledByStudioTitle: "Class cancelled by studio",
    classCancelledByStudioBody: "Sorry, {{className}} on {{date}} at {{time}} has been cancelled. You'll be notified about replacement classes.",
    instructorChangeTitle: "Instructor change",
    instructorChangeBody: "The instructor for {{className}} on {{date}} has changed from {{oldInstructor}} to {{newInstructor}}.",
    classTimeChangeTitle: "Class time change",
    classTimeChangeBody: "{{className}} on {{date}} has been moved from {{oldTime}} to {{newTime}}.",
    subscriptionExpiringTitle: "Subscription expiring",
    subscriptionExpiringBody: "Your {{planName}} subscription will expire on {{expiryDate}}. Renew to continue booking classes.",
    subscriptionExpiredTitle: "Subscription expired",
    subscriptionExpiredBody: "Your {{planName}} subscription has expired. Visit reception to renew.",
    waitlistPromotedTitle: "You're off the waitlist!",
    waitlistPromotedBody: "A spot opened up in {{className}} on {{date}} at {{time}}. You have been automatically booked!",
    classReminderTitle: "Class Reminder: {{className}}",
    classReminderBody: "Your {{className}} class with {{instructorName}} starts in {{minutes}} minutes!",
    generalNotificationTitle: "🧘‍♀️ Animo Pilates"
  },
  sq: {
    waitlistJoinedTitle: "U shtuat në listën e pritjes!",
    waitlistJoinedBody: "U shtuat në listën e pritjes për {{className}} më {{date}} në {{time}}. Pozicioni juaj: #{{position}}",
    classAssignmentTitle: "Caktim i ri ore!",
    classAssignmentBody: "Jeni caktuar në orën {{className}} me {{instructorName}} më {{date}} në {{time}}.",
    classBookedTitle: "Ora u rezervua!",
    classBookedBody: "Rezervimi juaj për {{className}} me {{instructorName}} u konfirmua për {{date}} në {{time}}.",
    classCancelledByStudioTitle: "Ora u anulua nga studio",
    classCancelledByStudioBody: "Na vjen keq, ora {{className}} më {{date}} në {{time}} u anulua. Do të njoftoheni për orë zëvendësuese.",
    instructorChangeTitle: "Ndryshim instruktori",
    instructorChangeBody: "Instruktori për orën {{className}} më {{date}} u ndryshua nga {{oldInstructor}} në {{newInstructor}}.",
    classTimeChangeTitle: "Ndryshim kohe ore",
    classTimeChangeBody: "Ora {{className}} më {{date}} u zhvendos nga {{oldTime}} në {{newTime}}.",
    subscriptionExpiringTitle: "Abonimi po skadon",
    subscriptionExpiringBody: "Abonimi juaj {{planName}} do të skadojë më {{expiryDate}}. Rinovoni për të vazhduar rezervimin e orëve.",
    subscriptionExpiredTitle: "Abonimi ka skaduar",
    subscriptionExpiredBody: "Abonimi juaj {{planName}} ka skaduar. Vizitoni recepsionin për të rinovuar.",
    waitlistPromotedTitle: "Nuk jeni më në listën e pritjes!",
    waitlistPromotedBody: "U lirua një vend në {{className}} më {{date}} në {{time}}. Jeni rezervuar automatikisht!",
    classReminderTitle: "Kujtues për orën: {{className}}",
    classReminderBody: "Ora juaj {{className}} me {{instructorName}} fillon pas {{minutes}} minutash!",
    generalNotificationTitle: "🧘‍♀️ Animo Pilates"
  }
};

// Simple template replacement function
function interpolate(template, data) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = data[key];
    if (value !== undefined && value !== null) {
      return value;
    }
    // Provide fallbacks for common undefined values
    switch (key) {
      case 'instructorName':
        return 'your instructor';
      case 'className':
        return 'your class';
      case 'minutes':
        return '15';
      default:
        return match; // Keep the original placeholder if no fallback
    }
  });
}

// Get translated notification content
function getTranslatedNotification(type, data, language = 'en') {
  const lang = translations[language] || translations.en;
  
  let titleKey, bodyKey;
  
  switch (type) {
    case 'waitlist_joined':
      titleKey = 'waitlistJoinedTitle';
      bodyKey = 'waitlistJoinedBody';
      break;
    case 'class_assignment':
      titleKey = 'classAssignmentTitle';
      bodyKey = 'classAssignmentBody';
      break;
    case 'class_booked':
      titleKey = 'classBookedTitle';
      bodyKey = 'classBookedBody';
      break;
    case 'class_cancelled_by_studio':
      titleKey = 'classCancelledByStudioTitle';
      bodyKey = 'classCancelledByStudioBody';
      break;
    case 'instructor_change':
      titleKey = 'instructorChangeTitle';
      bodyKey = 'instructorChangeBody';
      break;
    case 'class_time_change':
      titleKey = 'classTimeChangeTitle';
      bodyKey = 'classTimeChangeBody';
      break;
    case 'subscription_expiring':
      titleKey = 'subscriptionExpiringTitle';
      bodyKey = 'subscriptionExpiringBody';
      break;
    case 'subscription_expired':
      titleKey = 'subscriptionExpiredTitle';
      bodyKey = 'subscriptionExpiredBody';
      break;
    case 'waitlist_promoted':
      titleKey = 'waitlistPromotedTitle';
      bodyKey = 'waitlistPromotedBody';
      break;
    case 'class_reminder':
      titleKey = 'classReminderTitle';
      bodyKey = 'classReminderBody';
      break;
    default:
      return {
        title: lang.generalNotificationTitle,
        body: 'New notification from Animo Pilates'
      };
  }
  
  const title = interpolate(lang[titleKey] || lang.generalNotificationTitle, data);
  const body = interpolate(lang[bodyKey] || 'New notification', data);
  
  return { title, body };
}

// Get user language from database
async function getUserLanguage(supabase, userId) {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('language_preference')
      .eq('id', userId)
      .single();
    
    return user?.language_preference || 'en';
  } catch (error) {
    console.error('Error getting user language:', error);
    return 'en';
  }
}

module.exports = {
  getTranslatedNotification,
  getUserLanguage,
  translations
};
