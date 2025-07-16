/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

/**
 * ANIMO Pilates Studio - Mobile Design System v1.1
 * Refined minimalist color palette following the "rule of three"
 */

// 2.1 Brand & Neutrals
const neutralWhite = '#FFFFFF';        // Card / Surface 00
const softBeige = '#F8F6F3';          // App background 01
const warmTaupe = '#9B8A7D';          // Brand primary 02
const charcoal = '#2C2C2C';           // Primary text

// 2.2 Accent & States
const accent = '#6B8E7F';             // Primary CTAs, Success
const warning = '#D4A574';            // Pending / Alert
const error = '#C47D7D';              // Destructive, Validation

export const Colors = {
  light: {
    // Base Colors
    text: charcoal,
    background: softBeige,             // App background 01
    surface: neutralWhite,             // Card / Surface 00
    
    // Navigation & UI
    tint: warmTaupe,
    icon: warmTaupe,
    tabIconDefault: '#999999',
    tabIconSelected: warmTaupe,
    
    // Brand Colors
    primary: warmTaupe,                // Brand primary 02
    secondary: softBeige,              // Background variant
    accent: accent,                    // Primary CTAs, Success
    
    // Action Colors
    actionPrimary: accent,             // Primary CTAs, booking buttons
    actionSecondary: warmTaupe,        // Secondary actions
    
    // Semantic Colors
    success: accent,                   // Success states
    warning: warning,                  // Warning states  
    error: error,                      // Error states
    
    // Surface Variations
    surfaceElevated: neutralWhite,     // Cards with elevation
    surfaceVariant: '#FAFAF9',         // Subtle surface variant
    
    // Text Variations
    textSecondary: '#666666',          // Secondary text
    textMuted: '#999999',              // Muted text
    textOnAccent: neutralWhite,        // Text on accent colors
    
    // Borders & Dividers
    border: '#E8E6E3',                // Subtle borders
    divider: '#F0EFED',               // Very subtle dividers
  },
  dark: {
    // Base Colors
    text: '#F8F6F3',
    background: '#1A1A1A',
    surface: '#2C2C2C',
    
    // Navigation & UI
    tint: '#F8F6F3',
    icon: '#CCCCCC',
    tabIconDefault: '#999999',
    tabIconSelected: '#F8F6F3',
    
    // Brand Colors
    primary: '#F8F6F3',
    secondary: '#2C2C2C',
    accent: accent,
    
    // Action Colors
    actionPrimary: accent,
    actionSecondary: '#CCCCCC',
    
    // Semantic Colors
    success: accent,
    warning: warning,
    error: error,
    
    // Surface Variations
    surfaceElevated: '#3A3A3A',
    surfaceVariant: '#252525',
    
    // Text Variations
    textSecondary: '#CCCCCC',
    textMuted: '#999999',
    textOnAccent: neutralWhite,
    
    // Borders & Dividers
    border: '#444444',
    divider: '#333333',
  },
};
