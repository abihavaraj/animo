import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Modal, Portal, Surface } from 'react-native-paper';
import { useThemeColor } from '../hooks/useThemeColor';
import { getResponsiveModalDimensions, getSafeAreaPadding } from '../utils/responsiveUtils';

interface ResponsiveModalProps {
  visible: boolean;
  onDismiss: () => void;
  children: React.ReactNode;
  size?: 'small' | 'medium' | 'large' | 'fullscreen';
  dismissOnBackdrop?: boolean;
  style?: any;
  contentStyle?: any;
}

export function ResponsiveModal({
  visible,
  onDismiss,
  children,
  size = 'medium',
  dismissOnBackdrop = true,
  style,
  contentStyle
}: ResponsiveModalProps) {
  const modalDimensions = getResponsiveModalDimensions(size);
  const safeAreaPadding = getSafeAreaPadding();
  
  // Theme colors
  const surfaceColor = useThemeColor({}, 'surface');
  const overlayColor = 'rgba(0,0,0,0.5)';

  // For fullscreen modals, we use Portal Modal
  if (size === 'fullscreen') {
    return (
      <Portal>
        <Modal
          visible={visible}
          onDismiss={onDismiss}
          contentContainerStyle={[
            styles.fullscreenContainer,
            safeAreaPadding,
            style
          ]}
        >
          <Surface style={[
            styles.fullscreenSurface,
            { backgroundColor: surfaceColor },
            contentStyle
          ]}>
            {children}
          </Surface>
        </Modal>
      </Portal>
    );
  }

  // For other modal sizes, use custom overlay
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      {dismissOnBackdrop && (
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
      )}
      <Surface style={[
        styles.modalSurface,
        {
          backgroundColor: surfaceColor,
          width: modalDimensions.width,
          maxWidth: modalDimensions.maxWidth,
          minHeight: modalDimensions.minHeight,
          maxHeight: modalDimensions.maxHeight,
          margin: modalDimensions.margin,
          padding: modalDimensions.padding
        },
        style,
        contentStyle
      ]}>
        {children}
      </Surface>
    </View>
  );
}

// Also export a Portal version for react-native-paper compatibility
export function ResponsivePortalModal({
  visible,
  onDismiss,
  children,
  size = 'medium',
  style,
  contentStyle
}: ResponsiveModalProps) {
  const modalDimensions = getResponsiveModalDimensions(size);
  const surfaceColor = useThemeColor({}, 'surface');

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[
          styles.portalContainer,
          style
        ]}
      >
        <Surface style={[
          styles.portalSurface,
          {
            backgroundColor: surfaceColor,
            width: modalDimensions.width,
            maxWidth: modalDimensions.maxWidth,
            padding: modalDimensions.padding,
            margin: modalDimensions.margin
          },
          contentStyle
        ]}>
          {children}
        </Surface>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalSurface: {
    borderRadius: 16,
    alignItems: 'stretch',
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    alignSelf: 'center',
  },
  portalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  portalSurface: {
    borderRadius: 16,
    alignSelf: 'center',
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  fullscreenContainer: {
    flex: 1,
    margin: 0,
  },
  fullscreenSurface: {
    flex: 1,
    borderRadius: 0,
  }
});

export default ResponsiveModal;
