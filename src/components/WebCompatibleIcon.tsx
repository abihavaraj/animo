import React from 'react';
import { Platform } from 'react-native';

// For web, we'll use a simple div with text or Unicode symbols
// For native, we'll use react-native-vector-icons if available, otherwise fallback

interface WebCompatibleIconProps {
  name: string;
  size?: number;
  color?: string;
  style?: any;
}

const WebCompatibleIcon: React.FC<WebCompatibleIconProps> = ({ 
  name, 
  size = 24, 
  color = '#000', 
  style 
}) => {
  if (Platform.OS === 'web') {
    // Web fallback - use Unicode symbols or text
    const getWebIcon = (iconName: string) => {
      const iconMap: { [key: string]: string } = {
        // Basic actions
        'check-circle': '✅',
        'close': '✕',
        'add': '+',
        'edit': '✎',
        'delete': '🗑',
        'search': '🔍',
        'plus': '+',
        'minus': '−',
        'check': '✓',
        'refresh': '↻',
        'sync': '🔄',
        'download': '⬇',
        'upload': '⬆',
        'share': '📤',
        'copy': '📋',
        'cut': '✂',
        'paste': '📄',
        'save': '💾',
        'print': '🖨',
        'content-copy': '📋',
        'file-download': '⬇',
        'edit-note': '📝',
        'rate-review': '⭐',
        'radio-button-unchecked': '⚪',
        'view-list': '📋',
        
        // Navigation and layout
        'arrow-left': '←',
        'arrow-right': '→',
        'arrow-up': '↑',
        'arrow-down': '↓',
        'arrow-forward': '→',
        'arrow-back': '←',
        'chevron-left': '‹',
        'chevron-right': '›',
        'chevron-up': '⌃',
        'keyboard-arrow-down': '⌄',
        'menu': '☰',
        'more-vert': '⋮',
        'more-horiz': '⋯',
        
        // Reception portal specific icons
        'dashboard': '📊',
        'people': '👥',
        'person': '👤',
        'person-add': '👤➕',
        'fitness-center': '🏋️',
        'schedule': '📅',
        'card-membership': '🎫',
        'assessment': '📈',
        'business': '🏢',
        'notifications': '🔔',
        'logout': '🚪',
        'help-outline': '❓',
        'info': 'ℹ️',
        
        // Events and calendar
        'event': '📅',
        'event-busy': '📅❌',
        'calendar': '📅',
        'clock': '🕒',
        'today': '📅',
        'date-range': '📅',
        'timer': '⏲',
        'alarm': '⏰',
        'stopwatch': '⏱',
        'hourglass-empty': '⏳',
        'pending': '⏳',
        'schedule-2': '📅',
        'calendar-today': '📅',
        'event-note': '📋',
        'event-available': '✅',
        'access-time': '🕒',
        'history': '🕒',
        
        // User and account
        'user': '👤',
        'users': '👥',
        'account-circle': '👤',
        'group': '👥',
        'group-add': '👥➕',
        'login': '🚪',
        'manage-accounts': '👤⚙',
        'person-2': '👤',
        'people-2': '👥',
        'people-outline': '👥',
        
        // Communication
        'email': '📧',
        'mail': '📧',
        'message': '💬',
        'chat': '💬',
        'send': '📤',
        'inbox': '📥',
        'outbox': '📤',
        'phone': '📞',
        'contact-phone': '📞',
        'contact-emergency': '🚨',
        
        // Security
        'lock': '🔒',
        'unlock': '🔓',
        'security': '🛡️',
        'verified': '✅',
        'warning': '⚠️',
        'error': '❌',
        'key': '🔑',
        
        // Visibility
        'eye': '👁',
        'eye-off': '👁‍🗨',
        'visibility': '👁',
        'visibility-off': '👁‍🗨',
        
        // Favorites and ratings
        'heart': '♥',
        'star': '⭐',
        'star-outline': '☆',
        'bookmark': '🔖',
        'favorite': '♥',
        'thumb-up': '👍',
        'thumb-down': '👎',
        
        // Media controls
        'play': '▶️',
        'pause': '⏸️',
        'stop': '⏹️',
        'volume-up': '🔊',
        'volume-down': '🔉',
        'volume-off': '🔇',
        
        // Files and storage
        'file': '📄',
        'folder': '📁',
        'folder-open': '📂',
        'image': '🖼',
        'photo': '📷',
        'video': '🎥',
        'music': '🎵',
        'camera': '📷',
        'attachment': '📎',
        'link': '🔗',
        
        // Location and travel
        'location': '📍',
        'location-on': '📍',
        'map': '🗺',
        'directions': '🧭',
        'navigation': '🧭',
        'explore': '🧭',
        
        // Transportation
        'car': '🚗',
        'train': '🚆',
        'plane': '✈',
        'bike': '🚲',
        'walk': '🚶',
        'run': '🏃',
        
        // Sports and fitness
        'gym': '🏋',
        'sport': '⚽',
        'fitness': '🏋️',
        'exercise': '🏃',
        'pool': '🏊',
        'fitness-center-2': '🏋️',
        'sports-handball': '🤾',
        
        // Entertainment
        'game': '🎮',
        'movie': '🎬',
        'theater': '🎭',
        'headset': '🎧',
        'radio': '📻',
        'tv': '📺',
        
        // Food and drink
        'pizza': '🍕',
        'coffee': '☕',
        'tea': '🍵',
        'restaurant': '🍽',
        'wine': '🍷',
        'beer': '🍺',
        
        // Shopping and commerce
        'shopping': '🛒',
        'shopping-cart': '🛒',
        'shopping-bag': '🛍',
        'store': '🏪',
        'bag': '👜',
        'wallet': '👛',
        'money': '💰',
        'credit-card': '💳',
        'payment': '💳',
        
        // Buildings and places
        'bank': '🏦',
        'building': '🏢',
        'house': '🏠',
        'home': '🏠',
        'school': '🏫',
        'hospital': '🏥',
        'hotel': '🏨',
        
        // Medical and health
        'local-hospital': '🏥',
        'medical-services': '⚕️',
        
        // Weather and nature
        'fire': '🔥',
        'water': '💧',
        'snow': '❄',
        'sun': '☀',
        'moon': '🌙',
        'cloud': '☁',
        'rain': '🌧',
        'wind': '💨',
        'earth': '🌍',
        'tree': '🌳',
        'flower': '🌸',
        'leaf': '🍃',
        'grass': '🌱',
        
        // Work and office
        'work': '💼',
        'briefcase': '💼',
        'assignment': '📋',
        'description': '📄',
        'note': '📝',
        'notes': '📝',
        'document': '📄',
        
        // Tools
        'pencil': '✏',
        'pen': '🖊',
        'brush': '🖌',
        'ruler': '📏',
        'scissors': '✂',
        'paperclip': '📎',
        'pin': '📌',
        'hammer': '🔨',
        'wrench': '🔧',
        'build': '🔧',
        'construction': '🚧',
        
        // Technology
        'computer': '💻',
        'laptop': '💻',
        'desktop': '🖥',
        'keyboard': '⌨',
        'mouse': '🖱',
        'phone-mobile': '📱',
        'tablet': '📲',
        'watch': '⌚',
        'battery': '🔋',
        'plug': '🔌',
        'wifi': '📶',
        
        // Analytics and charts
        'analytics': '📊',
        'trending-up': '📈',
        'trending-down': '📉',
        'bar-chart': '📊',
        'pie-chart': '📊',
        'timeline': '📊',
        'insights': '📊',
        
        // Settings
        'settings': '⚙',
        'tune': '🎛',
        'memory': '💾',
        'storage': '💾',
        
        // Awards
        'trophy': '🏆',
        'medal': '🥇',
        'star-rate': '⭐',
        'crown': '👑',
        'gem': '💎',
        
        // Health and medical
        'pill': '💊',
        'medical': '🏥',
        'first-aid': '🩹',
        
        // Clothing
        'glasses': '👓',
        'hat': '👒',
        'shirt': '👕',
        'shoes': '👞',
        
        // Special occasions
        'gift': '🎁',
        'party': '🎉',
        'birthday': '🎂',
        'balloon': '🎈',
        'fireworks': '🎆',
        
        // Notifications
        'notifications-active': '🔔',
        'notifications-off': '🔕',
        'notification-important': '🔔',
        'do-not-disturb': '🔕',
        
        // Missing icons for reception reports and class management
        'list': '📋',
        'event-available-2': '✅',
        'autorenew': '🔄',
        'local-hospital-2': '🏥',
        'call': '📞',
        'person-remove': '👤❌',
        'remove-circle': '❌',
        'user-minus': '👤➖',
        'account-remove': '👤🗑',
        
        // Class management specific icons
        'account-plus': '👤➕',
        'account-minus': '👤➖'
      };
      
      return iconMap[iconName] || iconName.charAt(0).toUpperCase();
    };

    return (
      <span
        style={{
          fontSize: size,
          color: color,
          display: 'inline-block',
          lineHeight: 1,
          ...style,
        }}
      >
        {getWebIcon(name)}
      </span>
    );
  }

  // For React Native, try to use @expo/vector-icons if available
  try {
    // Try to import MaterialIcons from @expo/vector-icons
    const MaterialIcons = require('@expo/vector-icons/MaterialIcons').default;
    return (
      <MaterialIcons
        name={name}
        size={size}
        color={color}
        style={style}
      />
    );
  } catch (error) {
    console.warn('Failed to load MaterialIcons, using fallback:', error);
    // Try alternative import method
    try {
      const ExpoIcons = require('@expo/vector-icons');
      const MaterialIcons = ExpoIcons.MaterialIcons;
      return (
        <MaterialIcons
          name={name}
          size={size}
          color={color}
          style={style}
        />
      );
    } catch (secondError) {
      console.warn('Alternative MaterialIcons import also failed:', secondError);
      // Fallback for React Native if @expo/vector-icons is not available
      const { Text } = require('react-native');
      
      // Simple text fallback
      const iconText = name.charAt(0).toUpperCase() + name.charAt(1);
      
      return (
        <Text
          style={{
            fontSize: size * 0.6,
            color: color,
            textAlign: 'center',
            width: size,
            height: size,
            lineHeight: size,
            fontWeight: 'bold',
            ...style,
          }}
        >
          {iconText}
        </Text>
      );
    }
  }
};

export default WebCompatibleIcon; 