import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, StyleSheet, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { Button, Portal, RadioButton, Surface, Text, Title } from 'react-native-paper';
import { useThemeColor } from '../hooks/useDynamicThemeColor';
import { changeLanguage, getCurrentLanguage, getLanguageName, SUPPORTED_LANGUAGES, SupportedLanguage } from '../i18n';
import { getResponsiveModalDimensions } from '../utils/responsiveUtils';

interface LanguageSelectorProps {
  showAsButton?: boolean;
  onLanguageChange?: (language: SupportedLanguage) => void;
}

const { width, height } = Dimensions.get('window');

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  showAsButton = true,
  onLanguageChange
}) => {
  const { t, i18n } = useTranslation();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(getCurrentLanguage());
  const [currentLanguage, setCurrentLanguage] = useState(getCurrentLanguage());
  const [isChanging, setIsChanging] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);
  
  // Generate unique component ID to prevent multiple modals
  const componentId = React.useMemo(() => `language-selector-${Date.now()}-${Math.random()}`, []);
  
  // Use ref to track if modal is mounted
  const modalMountedRef = React.useRef(false);

  // Get responsive dimensions for modal
  const modalDimensions = getResponsiveModalDimensions('medium');

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const surfaceColor = useThemeColor({}, 'surface');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const textMutedColor = useThemeColor({}, 'textMuted');
  const primaryColor = useThemeColor({}, 'primary');
  const accentColor = useThemeColor({}, 'accent');
  const borderColor = useThemeColor({}, 'border');
  const dividerColor = useThemeColor({}, 'divider');

  const handleLanguageSelect = (languageCode: SupportedLanguage) => {
    // Language selected
    setSelectedLanguage(languageCode);
  };

  const handleSaveLanguage = async () => {
    // Save button pressed
    console.log('Modal: Current language:', getCurrentLanguage());
    
    if (selectedLanguage === getCurrentLanguage()) {
      console.log('Modal: Same language selected, closing modal');
      setModalVisible(false);
      return;
    }

    setIsChanging(true);
    try {
      console.log('Modal: Attempting to change language to:', selectedLanguage);
      const success = await changeLanguage(selectedLanguage);
      console.log('Modal: Language change result:', success);
      
      if (success) {
        setCurrentLanguage(selectedLanguage);
        onLanguageChange?.(selectedLanguage);
        // Small delay to ensure the translation updates are applied
        setTimeout(() => {
          setModalVisible(false);
          modalMountedRef.current = false;
          setIsChanging(false);
          console.log('Modal: Language change completed');
        }, 100);
      } else {
        console.error('Modal: Language change failed');
        setIsChanging(false);
      }
    } catch (error) {
      console.error('Modal: Error changing language:', error);
      setIsChanging(false);
    }
  };

  const handleInlineLanguageChange = async (languageCode: SupportedLanguage) => {
    if (languageCode === currentLanguage) return;
    
    console.log('handleInlineLanguageChange called with:', languageCode);
    setIsChanging(true);
    
    try {
      const success = await changeLanguage(languageCode);
      console.log('Language change result:', success);
      
      if (success) {
        setCurrentLanguage(languageCode);
        onLanguageChange?.(languageCode);
        
        // The language change will be handled by the languageChanged event listener
        setTimeout(() => {
          setIsChanging(false);
          console.log('Language change completed for:', languageCode);
        }, 200);
      } else {
        console.error('Language change failed for:', languageCode);
        setIsChanging(false);
      }
    } catch (error) {
      console.error('Error changing language:', error);
      setIsChanging(false);
    }
  };

  const openLanguageModal = () => {
    // Opening language modal
    
    // Prevent opening if already visible or mounted
    if (modalVisible || modalMountedRef.current) {
      console.log('Modal already visible or mounted, ignoring open request');
      return;
    }
    
    setSelectedLanguage(currentLanguage);
    setModalVisible(true);
    modalMountedRef.current = true;
  };

  // Update current language when i18n language changes
  React.useEffect(() => {
    const handleLanguageChange = (lng: string) => {
      console.log('i18n language changed to:', lng);
      setCurrentLanguage(lng as SupportedLanguage);
      setForceUpdate(prev => prev + 1);
    };

    i18n.on('languageChanged', handleLanguageChange);
    
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);

  // Update current language when component mounts
  React.useEffect(() => {
    const detectedLanguage = getCurrentLanguage();
    if (detectedLanguage !== currentLanguage) {
      setCurrentLanguage(detectedLanguage);
    }
  }, []);

  // Cleanup modal state when component unmounts
  React.useEffect(() => {
    return () => {
      if (modalVisible) {
        setModalVisible(false);
        modalMountedRef.current = false;
      }
    };
  }, [modalVisible]);

  if (showAsButton) {
    return (
      <>
        <Button
          mode="outlined"
          onPress={openLanguageModal}
          icon={({ size, color }) => (
            <MaterialIcons name="language" size={size} color={color} />
          )}
          style={[styles.languageButton, { borderColor: accentColor }]}
          labelStyle={{ color: textColor }}
        >
                     {getLanguageName(currentLanguage)}
        </Button>

        {modalVisible && (
          <Portal key={`language-selector-modal-${componentId}`}>
            <View style={styles.overlay}>
              <TouchableWithoutFeedback onPress={() => {
                console.log(`Overlay dismissed for component ${componentId}`);
                setModalVisible(false);
                modalMountedRef.current = false;
              }}>
                <View style={styles.overlayBackground} />
              </TouchableWithoutFeedback>
              
              <View style={[
                styles.modalContainer,
                {
                  backgroundColor: surfaceColor,
                  width: modalDimensions.width,
                  maxWidth: modalDimensions.maxWidth,
                  maxHeight: modalDimensions.maxHeight,
                  margin: modalDimensions.margin,
                  padding: modalDimensions.padding,
                }
              ]}>
                <Surface style={[styles.modalSurface, { backgroundColor: surfaceColor, borderColor }]}>
                  <View style={styles.modalHeader}>
                    <View style={styles.modalIconContainer}>
                      <MaterialIcons name="language" size={24} color={primaryColor} />
                    </View>
                    <Title style={[styles.modalTitle, { color: textColor }]}>
                      {t('profile.selectLanguage')}
                    </Title>
                    <Text style={[styles.modalDescription, { color: textSecondaryColor }]}>
                      {t('settings.selectYourLanguage')}
                    </Text>
                  </View>

                  <View style={styles.languageList}>
                    {SUPPORTED_LANGUAGES.map((language, index) => (
                      <View key={language.code}>
                        <TouchableOpacity 
                          style={[
                            styles.languageOption,
                            selectedLanguage === language.code && { 
                              backgroundColor: `${primaryColor}12`,
                              borderColor: `${primaryColor}30`,
                              borderWidth: 1,
                            }
                          ]}
                          onPress={() => handleLanguageSelect(language.code)}
                          activeOpacity={0.7}
                        >
                          <RadioButton
                            value={language.code}
                            status={selectedLanguage === language.code ? 'checked' : 'unchecked'}
                            onPress={() => handleLanguageSelect(language.code)}
                            color={primaryColor}
                          />
                          <View style={styles.languageInfo}>
                            <Text style={[styles.languageName, { color: textColor }]}>
                              {language.nativeName}
                            </Text>
                            <Text style={[styles.languageEnglishName, { color: textSecondaryColor }]}>
                              {language.name}
                            </Text>
                          </View>
                          {selectedLanguage === language.code && (
                            <MaterialIcons name="check-circle" size={20} color={primaryColor} />
                          )}
                        </TouchableOpacity>
                        {index < SUPPORTED_LANGUAGES.length - 1 && (
                          <View style={[styles.languageDivider, { backgroundColor: dividerColor }]} />
                        )}
                      </View>
                    ))}
                  </View>

                  <View style={[styles.changeNoteContainer, { backgroundColor: `${accentColor}08` }]}>
                    <MaterialIcons name="info" size={16} color={textSecondaryColor} />
                    <Text style={[styles.changeNote, { color: textSecondaryColor }]}>
                      {t('settings.languageChangeNote')}
                    </Text>
                  </View>

                  <View style={styles.modalActions}>
                    <Button
                      mode="outlined"
                      onPress={() => {
                        setModalVisible(false);
                        modalMountedRef.current = false;
                      }}
                      style={[styles.cancelButton, { borderColor: textMutedColor }]}
                      labelStyle={{ color: textColor }}
                      disabled={isChanging}
                    >
                      {t('common.cancel')}
                    </Button>
                    <Button
                      mode="contained"
                      onPress={handleSaveLanguage}
                      style={[styles.saveButton, { backgroundColor: accentColor }]}
                      labelStyle={{ color: 'white' }}
                      loading={isChanging}
                      disabled={isChanging}
                    >
                      {t('common.save')}
                    </Button>
                  </View>
                </Surface>
              </View>
            </View>
          </Portal>
        )}
      </>
    );
  }

  // Inline version for settings screens
  return (
    <View style={styles.inlineContainer}>
      <Text style={[styles.settingLabel, { color: textColor }]}>
        {t('settings.languagePreference')}
      </Text>
      <Text style={[styles.settingDescription, { color: textSecondaryColor }]}>
        {t('settings.selectYourLanguage')}
      </Text>
      
             <View style={styles.languageList}>
         {SUPPORTED_LANGUAGES.map((language) => (
           <View key={language.code} style={[styles.languageOption, isChanging && { opacity: 0.6 }]}>
             <RadioButton
               value={language.code}
               status={currentLanguage === language.code ? 'checked' : 'unchecked'}
               onPress={() => handleInlineLanguageChange(language.code)}
               color={primaryColor}
               disabled={isChanging}
             />
             <View style={styles.languageInfo}>
               <Text style={[styles.languageName, { color: textColor }]}>
                 {language.nativeName}
                 {isChanging && currentLanguage !== language.code && ' ...'}
               </Text>
               <Text style={[styles.languageEnglishName, { color: textSecondaryColor }]}>
                 {language.name}
               </Text>
             </View>
           </View>
         ))}
       </View>
       
       {isChanging && (
         <Text style={[styles.changingText, { color: textSecondaryColor }]}>
           {t('common.loading')}...
         </Text>
       )}
    </View>
  );
};

const styles = StyleSheet.create({
  languageButton: {
    marginVertical: 8,
    borderRadius: 12,
    elevation: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  overlayBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    borderRadius: 20,
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    alignSelf: 'center',
    zIndex: 1001,
  },
  modalSurface: {
    borderRadius: 20,
    borderWidth: 1,
    elevation: 0,
  },
  modalHeader: {
    alignItems: 'center',
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    marginBottom: 20,
  },
  modalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.8,
  },
  languageList: {
    marginBottom: 20,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginVertical: 2,
    minHeight: 64,
  },
  languageInfo: {
    marginLeft: 16,
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  languageEnglishName: {
    fontSize: 14,
    opacity: 0.7,
  },
  languageDivider: {
    height: 1,
    marginLeft: 56,
    marginVertical: 4,
  },
  changeNoteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  changeNote: {
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 12,
    elevation: 1,
  },
  saveButton: {
    flex: 1,
    borderRadius: 12,
    elevation: 2,
  },
  inlineContainer: {
    marginBottom: 20,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  settingDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  changingText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
});

export default LanguageSelector;
