/**
 * ANIMO Pilates Studio - Spacing & Grid System
 * Mobile Design System v1.1
 */

export const spacing = {
  xs: 4,    // Tight spacing, small gaps
  sm: 8,    // Small spacing, icon margins
  md: 16,   // Standard spacing, card padding
  lg: 24,   // Large spacing, section gaps
  xl: 32,   // Extra large spacing, major sections
} as const;

// Grid System
export const grid = {
  // Mobile grid: 1 column, 16px side gutters, 8px baseline
  mobile: {
    columns: 1,
    gutters: spacing.md,
    baseline: spacing.sm,
  },
  // Tablet ≥ 768dp: 2 columns, 24px gutters
  tablet: {
    columns: 2,
    gutters: spacing.lg,
    baseline: spacing.sm,
  },
} as const;

// Layout Constants
export const layout = {
  headerHeight: 60,
  tabBarHeight: 60,
  borderRadius: 16,
  cardPadding: spacing.md,
  screenPadding: spacing.md,
} as const;
