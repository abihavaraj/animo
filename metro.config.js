const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname, {
  // Enable CSS support for web fonts
  isCSSEnabled: true,
});

// Add font file extensions
config.resolver.assetExts.push(
  // Fonts
  'ttf',
  'otf',
  'woff',
  'woff2',
  'eot'
);

// Ensure web platform is supported
config.resolver.platforms = ['ios', 'android', 'web'];

// Configure for web platform to prevent font loading issues
if (process.env.EXPO_PLATFORM === 'web') {
  // Block problematic font files for web builds to prevent corruption
  config.resolver.blockList = [
    /node_modules\/@expo\/vector-icons\/build\/vendor\/react-native-vector-icons\/Fonts\/MaterialCommunityIcons\.ttf$/,
    /node_modules\/react-native-vector-icons\/Fonts\/MaterialCommunityIcons\.ttf$/,
    /node_modules\/@expo\/vector-icons\/build\/vendor\/react-native-vector-icons\/Fonts\/MaterialIcons\.ttf$/,
    /node_modules\/react-native-vector-icons\/Fonts\/MaterialIcons\.ttf$/,
  ];
}

module.exports = config; 