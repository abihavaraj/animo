const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname, {
  // Disable CSS support to avoid potential conflicts.
  isCSSEnabled: false,
});

// This is the simplest and most robust configuration for most Expo projects.
// Customizations below were removed as they are potential sources of Hermes conflicts.

module.exports = config; 