const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname, {
  // Disable CSS support to avoid potential conflicts.
  isCSSEnabled: false,
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

module.exports = config; 