import { CreateThemeData } from './themeService';

/**
 * 🎄 Christmas Theme - Modern Winter Wonderland Design
 * 
 * Inspired by modern Christmas design trends:
 * - Deep forest greens with gold accents (Enchanting Tales theme)
 * - Warm whites and soft creams (Minimalist Winter Wonderland)
 * - Rich burgundy and cranberry reds (Heirloom Splendour)
 * - Subtle shimmer effects through color gradients
 * 
 * Color Psychology:
 * - Forest Green: Trust, growth, harmony (perfect for wellness app)
 * - Gold: Luxury, warmth, celebration
 * - Burgundy: Sophistication, warmth, elegance
 * - Cream: Purity, peace, comfort
 * - Deep Blue: Calm, stability, winter sky
 */

export const christmasThemeData: CreateThemeData = {
  name: 'christmas_2024',
  display_name: '🎄 Christmas Magic',
  description: 'A modern winter wonderland theme with forest greens, gold accents, and warm burgundy touches. Perfect for the holiday season while maintaining the wellness-focused aesthetic of your Pilates studio.',
  colors: {
    // Primary Brand Colors - Forest Green with Gold Accents
    primary: '#2D5016',           // Deep forest green - main brand color
    secondary: '#F8F6F3',         // Warm cream - soft background
    accent: '#D4A574',            // Warm gold - call-to-action buttons
    
    // Background & Surface Colors
    background: '#FEFCF9',        // Very light cream - main background
    surface: '#FFFFFF',           // Pure white - cards and elevated surfaces
    surfaceElevated: '#FFFFFF',   // Pure white - elevated cards
    surfaceVariant: '#F8F6F3',    // Soft cream - subtle surface variant
    
    // Text Colors - High contrast for accessibility
    text: '#1A1A1A',              // Near black - primary text
    textSecondary: '#4A4A4A',     // Dark gray - secondary text
    textMuted: '#6B6B6B',         // Medium gray - muted text
    textOnAccent: '#FFFFFF',      // White text on accent colors
    
    // Navigation & UI Elements
    tint: '#2D5016',              // Forest green - navigation tint
    icon: '#2D5016',              // Forest green - icons
    tabIconDefault: '#8B8B8B',    // Medium gray - inactive tabs
    tabIconSelected: '#2D5016',   // Forest green - active tabs
    
    // Action Colors
    actionPrimary: '#D4A574',     // Warm gold - primary buttons
    actionSecondary: '#2D5016',   // Forest green - secondary buttons
    
    // Semantic Colors - Christmas-inspired
    success: '#2D5016',           // Forest green - success states
    warning: '#B8860B',           // Dark goldenrod - warnings
    error: '#8B0000',             // Dark red - error states
    
    // Borders & Dividers
    border: '#E8E6E3',            // Light beige - subtle borders
    divider: '#F0EFED',           // Very light beige - dividers
    
    // Christmas Special Colors (additional properties)
    christmasGold: '#D4A574',     // Warm gold for special elements
    christmasGreen: '#2D5016',    // Deep forest green
    christmasRed: '#8B0000',      // Deep burgundy red
    christmasCream: '#F8F6F3',    // Warm cream
    christmasWhite: '#FFFFFF',    // Pure white
    christmasSilver: '#C0C0C0',   // Silver accent
  },
  start_date: '2024-12-01',       // Start December 1st
  end_date: '2025-01-15',         // End January 15th (extended holiday season)
};

/**
 * Alternative Christmas Theme - Celestial Winter
 * A more modern, minimalist approach with deep blues and silver
 */
export const celestialChristmasThemeData: CreateThemeData = {
  name: 'celestial_christmas_2024',
  display_name: '✨ Celestial Winter',
  description: 'A modern celestial Christmas theme with deep royal blues, silver accents, and cosmic elegance. Perfect for a sophisticated winter aesthetic.',
  colors: {
    // Primary Brand Colors - Deep Blue with Silver
    primary: '#1E3A8A',           // Deep royal blue
    secondary: '#F8FAFC',         // Light blue-gray
    accent: '#C0C0C0',            // Silver accent
    
    // Background & Surface Colors
    background: '#F8FAFC',        // Light blue-gray background
    surface: '#FFFFFF',           // Pure white surfaces
    surfaceElevated: '#FFFFFF',   // Pure white elevated
    surfaceVariant: '#F1F5F9',    // Very light blue-gray
    
    // Text Colors
    text: '#1E293B',              // Dark blue-gray text
    textSecondary: '#475569',     // Medium blue-gray
    textMuted: '#64748B',         // Light blue-gray
    textOnAccent: '#FFFFFF',      // White on accent
    
    // Navigation & UI
    tint: '#1E3A8A',              // Deep blue tint
    icon: '#1E3A8A',              // Deep blue icons
    tabIconDefault: '#94A3B8',    // Light blue-gray inactive
    tabIconSelected: '#1E3A8A',   // Deep blue active
    
    // Action Colors
    actionPrimary: '#C0C0C0',     // Silver primary
    actionSecondary: '#1E3A8A',   // Deep blue secondary
    
    // Semantic Colors
    success: '#059669',           // Emerald green
    warning: '#D97706',           // Amber
    error: '#DC2626',             // Red
    
    // Borders & Dividers
    border: '#E2E8F0',            // Light blue-gray border
    divider: '#F1F5F9',           // Very light blue-gray divider
    
    // Celestial Special Colors
    celestialBlue: '#1E3A8A',     // Deep royal blue
    celestialSilver: '#C0C0C0',   // Silver
    celestialWhite: '#FFFFFF',    // Pure white
    celestialGray: '#F8FAFC',     // Light blue-gray
  },
  start_date: '2024-12-01',
  end_date: '2025-01-15',
};

/**
 * Cozy Christmas Theme - Warm and Inviting
 * Traditional Christmas with modern touches
 */
export const cozyChristmasThemeData: CreateThemeData = {
  name: 'cozy_christmas_2024',
  display_name: '🏠 Cozy Christmas',
  description: 'A warm and inviting Christmas theme with traditional reds, greens, and cozy browns. Perfect for creating a homey, comfortable atmosphere.',
  colors: {
    // Primary Brand Colors - Traditional Christmas
    primary: '#B91C1C',           // Deep red
    secondary: '#FEF2F2',         // Light red background
    accent: '#059669',            // Forest green accent
    
    // Background & Surface Colors
    background: '#FEF2F2',        // Very light red background
    surface: '#FFFFFF',           // Pure white surfaces
    surfaceElevated: '#FFFFFF',   // Pure white elevated
    surfaceVariant: '#FEF7F7',    // Very light red variant
    
    // Text Colors
    text: '#1F2937',              // Dark gray text
    textSecondary: '#4B5563',     // Medium gray
    textMuted: '#6B7280',         // Light gray
    textOnAccent: '#FFFFFF',      // White on accent
    
    // Navigation & UI
    tint: '#B91C1C',              // Deep red tint
    icon: '#B91C1C',              // Deep red icons
    tabIconDefault: '#9CA3AF',    // Light gray inactive
    tabIconSelected: '#B91C1C',   // Deep red active
    
    // Action Colors
    actionPrimary: '#059669',     // Forest green primary
    actionSecondary: '#B91C1C',   // Deep red secondary
    
    // Semantic Colors
    success: '#059669',           // Forest green success
    warning: '#D97706',           // Amber warning
    error: '#DC2626',             // Red error
    
    // Borders & Dividers
    border: '#FECACA',            // Light red border
    divider: '#FEF2F2',           // Very light red divider
    
    // Cozy Special Colors
    cozyRed: '#B91C1C',           // Deep red
    cozyGreen: '#059669',         // Forest green
    cozyBrown: '#92400E',         // Warm brown
    cozyCream: '#FEF2F2',         // Light red cream
    cozyWhite: '#FFFFFF',         // Pure white
  },
  start_date: '2024-12-01',
  end_date: '2025-01-15',
};