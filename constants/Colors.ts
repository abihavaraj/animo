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
const forestGreen = '#8FA8A3';        // Brand primary 02 (Updated to softer accent)
const charcoal = '#2C2C2C';           // Primary text

// 2.2 Accent & States
const accent = '#8FA8A3';             // Primary CTAs, Success (softer)
const warning = '#E6B17A';            // Pending / Alert (softer)
const error = '#D4A5A5';              // Destructive, Validation (softer)

// 2.3 Unified Clean Colors (Authentic & Minimal)
const cleanPrimary = '#8FA8A3';       // Main brand color - forest green
const cleanSecondary = '#6B8E7F';     // Darker forest green for contrast
const cleanNeutral = '#9CA3AF';       // Clean gray for secondary elements
const cleanSuccess = '#10B981';       // Clean green for success states
const cleanWarning = '#F59E0B';       // Clean amber for warnings
const cleanDanger = '#EF4444';        // Clean red for danger/full states

// Transparent backgrounds for class status
const transparentRed = 'rgba(239, 68, 68, 0.1)';     // For full classes
const transparentOrange = 'rgba(245, 158, 11, 0.1)';  // For almost full classes
const transparentGreen = 'rgba(16, 185, 129, 0.1)';   // For available classes

export const Colors = {
  light: {
    // Base Colors
    text: charcoal,
    background: neutralWhite,             // App background 01
    surface: neutralWhite,             // Card / Surface 00
    
    // Navigation & UI
    tint: forestGreen,
    icon: forestGreen,
    tabIconDefault: '#999999',
    tabIconSelected: forestGreen,
    
    // Brand Colors
    primary: forestGreen,              // Brand primary 02
    secondary: neutralWhite,           // Background variant
    accent: accent,                    // Primary CTAs, Success
    
    // Action Colors
    actionPrimary: accent,             // Primary CTAs, booking buttons
    actionSecondary: forestGreen,      // Secondary actions
    
    // Semantic Colors
    success: accent,                   // Success states
    warning: warning,                  // Warning states  
    error: error,                      // Error states
    
    // Surface Variations
    surfaceElevated: neutralWhite,     // Cards with elevation
    surfaceVariant: '#F8F9F8',         // Subtle surface variant (softer)
    
    // Text Variations
    textSecondary: '#666666',          // Secondary text
    textMuted: '#999999',              // Muted text
    textOnAccent: neutralWhite,        // Text on accent colors
    
    // Borders & Dividers
    border: '#E8EBE8',                // Subtle borders (softer)
    divider: '#F0F2F0',               // Very subtle dividers (softer)
    
    // Unified Clean Colors (Minimal & Authentic)
    cleanPrimary: cleanPrimary,       // Main brand color
    cleanSecondary: cleanSecondary,   // Darker brand color for contrast
    cleanNeutral: cleanNeutral,       // Clean gray for secondary elements
    cleanSuccess: cleanSuccess,       // Clean green for success
    cleanWarning: cleanWarning,       // Clean amber for warnings
    cleanDanger: cleanDanger,         // Clean red for danger/full
    
    // Transparent Status Backgrounds
    transparentRed: transparentRed,       // Full classes background
    transparentOrange: transparentOrange, // Almost full classes background
    transparentGreen: transparentGreen,   // Available classes background
  },
  dark: {
    // Base Colors
    text: '#FFFFFF',
    background: '#1A1A1A',
    surface: '#2C2C2C',
    
    // Navigation & UI
    tint: '#FFFFFF',
    icon: '#CCCCCC',
    tabIconDefault: '#999999',
    tabIconSelected: '#FFFFFF',
    
    // Brand Colors
    primary: '#FFFFFF',
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
