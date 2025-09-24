import React, { useEffect, useState } from 'react';
import { Animated, Dimensions, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Card, Text } from 'react-native-paper';
import { useThemeColor } from '../hooks/useDynamicThemeColor';
import { Announcement, announcementService } from '../services/announcementService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface AnnouncementPopupProps {
  onDismiss?: () => void;
}

const AnnouncementPopup: React.FC<AnnouncementPopupProps> = ({ onDismiss }) => {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const surfaceColor = useThemeColor({}, 'surface');
  const textColor = useThemeColor({}, 'text');
  const accentColor = useThemeColor({}, 'accent');
  const errorColor = useThemeColor({}, 'error');
  const warningColor = useThemeColor({}, 'warning');
  const successColor = useThemeColor({}, 'success');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const borderColor = useThemeColor({}, 'border');
  const overlayColor = useThemeColor({}, 'background');
  
  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const scaleAnim = useState(new Animated.Value(0.8))[0];
  const slideAnim = useState(new Animated.Value(50))[0];

  useEffect(() => {
    loadActiveAnnouncement();
  }, []);

  const loadActiveAnnouncement = async () => {
    try {
      setLoading(true);
      const activeAnnouncement = await announcementService.getActiveAnnouncement();
      
      if (activeAnnouncement) {
        setAnnouncement(activeAnnouncement);
        setVisible(true);
        startEntranceAnimation();
      } else {
        setVisible(false);
      }
    } catch (error) {
      console.error('Error loading announcement:', error);
      setVisible(false);
    } finally {
      setLoading(false);
    }
  };

  const startEntranceAnimation = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const startExitAnimation = (callback: () => void) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 50,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(callback);
  };

  const handleDismiss = () => {
    startExitAnimation(() => {
      setVisible(false);
      setAnnouncement(null);
      onDismiss?.();
    });
  };

  const getPriorityColor = (type: string) => {
    switch (type) {
      case 'urgent':
        return errorColor;
      case 'warning':
        return warningColor;
      case 'info':
        return accentColor;
      default:
        return accentColor;
    }
  };

  const getPriorityIcon = (type: string) => {
    switch (type) {
      case 'urgent':
        return 'alert-circle';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      default:
        return 'info';
    }
  };

  if (loading || !announcement || !visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={handleDismiss}
    >
      <TouchableOpacity
        style={[styles.overlay, { backgroundColor: `${overlayColor}CC` }]}
        activeOpacity={1}
        onPress={handleDismiss}
      >
        <Animated.View
          style={[
            styles.container,
            {
              opacity: fadeAnim,
              transform: [
                { scale: scaleAnim },
                { translateY: slideAnim },
              ],
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Card style={[styles.card, { backgroundColor: surfaceColor }]}>
              <Card.Content style={styles.content}>
                {/* Header with priority indicator */}
                <View style={styles.header}>
                  <View style={styles.priorityContainer}>
                                         <Button
                       icon={getPriorityIcon(announcement.type)}
                       mode="contained"
                       style={[
                         styles.priorityButton,
                         { backgroundColor: getPriorityColor(announcement.type) },
                       ]}
                       labelStyle={styles.priorityLabel}
                       compact
                     >
                       {announcement.type.toUpperCase()}
                     </Button>
                  </View>
                  <Button
                    icon="close"
                    mode="text"
                    onPress={handleDismiss}
                    textColor={textSecondaryColor}
                    compact
                  />
                </View>

                {/* Title */}
                <Text
                  variant="headlineSmall"
                  style={[styles.title, { color: textColor }]}
                >
                  {announcement.title}
                </Text>

                {/* Message */}
                <Text
                  variant="bodyLarge"
                  style={[styles.message, { color: textColor }]}
                >
                  {announcement.message}
                </Text>

                {/* Footer with tap to dismiss hint */}
                <View style={[styles.footer, { borderTopColor: borderColor }]}>
                  <Text
                    variant="bodySmall"
                    style={[styles.dismissHint, { color: textSecondaryColor }]}
                  >
                    Tap anywhere to dismiss
                  </Text>
                </View>
              </Card.Content>
            </Card>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 400,
  },
  card: {
    borderRadius: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  content: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  priorityContainer: {
    flex: 1,
  },
  priorityButton: {
    alignSelf: 'flex-start',
    borderRadius: 20,
  },
  priorityLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 12,
    lineHeight: 28,
  },
  message: {
    lineHeight: 24,
    marginBottom: 20,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
  },
  dismissHint: {
    fontStyle: 'italic',
  },
});

export default AnnouncementPopup;
