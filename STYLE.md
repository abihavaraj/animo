# ANIMO Pilates Studio

**Mobile Design System v1.1** · June 2025

> A single source of truth for designers & engineers building the ANIMO Pilates experience on **iOS** and **Android**.

---

## 1 · Design Principles

| Principle                 | What it means in practice                                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Minimal, not sterile**  | Large white (or near‑white) surfaces, 1 accent color, restrained iconography. Remove anything that doesn't guide a user action. |
| **Warm & human**          | Soft neutrals, generous corner‑radii (16 px), micro‑shadows (1–2 dp), subtle motion.                                            |
| **Predictable**           | Every screen follows the same header ➜ content ➜ CTAs ➜ nav order. Elements never jump positions between tabs.                  |
| **Accessible from day 1** | WCAG 2.2 AA color contrast, ≥ 44 × 44 px touch targets, motion‐safe prefers‑reduced‑motion fallbacks.                           |
| **Theme‑aware**           | Light & Dark palettes share logic: identical hue roles, identical semantic names.                                               |

---

## 2 · Color Palette

### 2.1 Brand & Neutrals

```ts
export const Colors = {
  neutralWhite:  '#FFFFFF',    // Card / Surface 00
  softBeige:     '#F8F6F3',    // App background 01
  warmTaupe:     '#9B8A7D',    // Brand primary 02
  charcoal:      '#2C2C2C',    // Primary text  
};
```

### 2.2 Accent & States

```ts
export const Accent  = '#6B8E7F';   // Primary CTAs, Success
export const Warning = '#D4A574';   // Pending / Alert
export const Error   = '#C47D7D';   // Destructive, Validation
```

> **Rule of three**: Every screen should show *max three* distinct hues: background neutral + brand or text neutral + optional accent/state.

### Light Mode Color System
| Purpose | Color | Hex Code | Usage |
|---------|-------|----------|-------|
| **Background** | Soft Beige | `#F8F6F3` | Main app background |
| **Surface** | White | `#ffffff` | Cards, modals, elevated surfaces |
| **Primary Text** | Charcoal | `#2C2C2C` | Headlines, body text |
| **Secondary Text** | Medium Gray | `#666666` | Supporting text, labels |
| **Muted Text** | Light Gray | `#999999` | Meta information, placeholders |
| **Brand Primary** | Warm Gray | `#9B8A7D` | Brand elements, navigation |
| **Action Primary** | Muted Teal | `#6B8E7F` | Primary buttons, CTAs |
| **Success** | Muted Teal | `#6B8E7F` | Success states, confirmations |
| **Warning** | Soft Warning | `#D4A574` | Warning states, pending actions |
| **Error** | Soft Error | `#C47D7D` | Error states, destructive actions |
| **Border** | Light Border | `#E8E6E3` | Card borders, dividers |

### Dark Mode Color System
| Purpose | Color | Hex Code | Usage |
|---------|-------|----------|-------|
| **Background** | Dark Gray | `#1A1A1A` | Main app background |
| **Surface** | Medium Dark | `#2C2C2C` | Cards, modals, elevated surfaces |
| **Primary Text** | Soft Beige | `#F8F6F3` | Headlines, body text |
| **Secondary Text** | Light Gray | `#CCCCCC` | Supporting text, labels |
| **Muted Text** | Medium Gray | `#999999` | Meta information, placeholders |
| **Brand Primary** | Soft Beige | `#F8F6F3` | Brand elements, navigation |
| **Action Primary** | Muted Teal | `#6B8E7F` | Primary buttons, CTAs |
| **Border** | Dark Border | `#444444` | Card borders, dividers |

---

## Typography Scale

### Hierarchy
```typescript
H1: 24px bold       // Page titles, major headings
H2: 20px semi-bold  // Section titles, card headers
H3: 18px semi-bold  // Sub-section headers
Body: 16px regular  // Main body text, paragraphs
Caption: 14px medium // Supporting text, labels
Small: 12px medium  // Meta info, fine print
```

### Font Weights
- **Bold (700)**: H1 headings, emphasis
- **Semi-bold (600)**: H2, H3 headings
- **Medium (500)**: Captions, small text, labels
- **Regular (400)**: Body text, paragraphs

### Line Heights
- **H1**: 30px (1.25x)
- **H2**: 26px (1.3x)
- **H3**: 24px (1.33x)
- **Body**: 22px (1.375x)
- **Caption**: 20px (1.43x)
- **Small**: 16px (1.33x)

### Usage Examples
```jsx
import { H1, H2, H3, Body, Caption, Small } from '@/components/ui/Typography';

// Page title
<H1>Welcome to ANIMO</H1>

// Section header
<H2>Your Classes</H2>

// Sub-section
<H3>Upcoming Sessions</H3>

// Main content
<Body>Join us for a transformative pilates experience...</Body>

// Supporting text
<Caption>Next class starts in 30 minutes</Caption>

// Meta information
<Small>Last updated 5 minutes ago</Small>
```

---

## Spacing System

### Scale
```typescript
const spacing = {
  xs: 4,    // Tight spacing, small gaps
  sm: 8,    // Small spacing, icon margins
  md: 16,   // Standard spacing, card padding
  lg: 24,   // Large spacing, section gaps
  xl: 32,   // Extra large spacing, major sections
}
```

### Usage Guidelines
- **4px**: Icon margins, tight element spacing
- **8px**: Small gaps between related elements
- **16px**: Standard card padding, button spacing
- **24px**: Section headers, major element gaps
- **32px**: Page margins, major section separation

---

## Component Styles

### Cards
```typescript
const cardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: 16,
  padding: 16,
  marginBottom: 16,
  elevation: 1,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.1,
  shadowRadius: 2,
  borderWidth: 1,
  borderColor: '#E8E6E3',
}
```

### Primary Buttons
```typescript
const primaryButtonStyle = {
  backgroundColor: '#6B8E7F',
  borderRadius: 16,
  paddingVertical: 12,
  paddingHorizontal: 24,
  elevation: 2,
  shadowColor: '#6B8E7F',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.2,
  shadowRadius: 2,
}
```

### Secondary Buttons
```typescript
const secondaryButtonStyle = {
  backgroundColor: '#ffffff',
  borderRadius: 16,
  paddingVertical: 12,
  paddingHorizontal: 24,
  borderWidth: 1,
  borderColor: '#E8E6E3',
}
```

### Status Chips
```typescript
// Success chip
const successChip = {
  backgroundColor: 'rgba(107, 142, 127, 0.1)',
  borderColor: 'rgba(107, 142, 127, 0.2)',
  textColor: '#6B8E7F',
}

// Warning chip
const warningChip = {
  backgroundColor: 'rgba(212, 165, 116, 0.1)',
  borderColor: 'rgba(212, 165, 116, 0.2)',
  textColor: '#D4A574',
}

// Neutral chip
const neutralChip = {
  backgroundColor: 'rgba(249, 246, 243, 1)',
  borderColor: '#E8E6E3',
  textColor: '#666666',
}
```

---

## Layout Guidelines

### Screen Structure
```
┌─────────────────────────────────┐
│ Header (60px + safe area)       │
├─────────────────────────────────┤
│ Content Area                    │
│ - 16px horizontal padding       │
│ - 16px vertical spacing         │
│ - Cards with 16px margins       │
├─────────────────────────────────┤
│ Tab Navigation (60px)           │
└─────────────────────────────────┘
```

### Grid System
- **Mobile**: Single column layout with 16px margins
- **Tablet**: Responsive grid with 24px margins
- **Cards**: Full width with 16px horizontal margins
- **Buttons**: Full width or flex-based responsive sizing

### Safe Areas
- **Top**: Account for status bar and notches
- **Bottom**: Account for home indicator and tab navigation
- **Sides**: 16px minimum margins on all screen sizes

---

## Navigation Design

### Tab Bar
```typescript
const tabBarStyle = {
  backgroundColor: '#ffffff',
  borderTopWidth: 1,
  borderTopColor: '#E8E6E3',
  height: 60,
  paddingBottom: 8,
  paddingTop: 8,
}

const tabIconStyle = {
  size: 24,
  activeColor: '#9B8A7D',
  inactiveColor: '#999999',
}
```

### Header
```typescript
const headerStyle = {
  backgroundColor: '#9B8A7D',
  elevation: 0,
  shadowOpacity: 0,
  borderBottomWidth: 0,
}

const headerTitleStyle = {
  color: '#ffffff',
  fontSize: 20,
  fontWeight: '600',
}
```

---

## Interactive States

### Button States
```typescript
// Default state
const defaultButton = {
  opacity: 1,
  transform: [{ scale: 1 }],
}

// Pressed state
const pressedButton = {
  opacity: 0.8,
  transform: [{ scale: 0.98 }],
}

// Disabled state
const disabledButton = {
  opacity: 0.5,
  backgroundColor: '#E8E6E3',
}
```

### Card States
```typescript
// Default card
const defaultCard = {
  elevation: 1,
  shadowOpacity: 0.1,
}

// Pressed card
const pressedCard = {
  elevation: 3,
  shadowOpacity: 0.15,
  transform: [{ scale: 0.98 }],
}
```

---

## Accessibility Guidelines

### Color Contrast
- **Primary text on background**: 4.5:1 minimum ratio
- **Secondary text on background**: 3:1 minimum ratio
- **Interactive elements**: 3:1 minimum ratio
- **Focus indicators**: High contrast borders

### Touch Targets
- **Minimum size**: 44px × 44px
- **Recommended size**: 48px × 48px
- **Spacing**: 8px minimum between targets

### Typography
- **Minimum font size**: 12px
- **Body text**: 16px recommended
- **Line height**: 1.3x minimum for readability

---

## Usage Examples

### Dashboard Card
```jsx
<Card style={styles.card}>
  <Card.Content style={styles.cardContent}>
    <View style={styles.sectionHeader}>
      <H2 color="#2C2C2C">Your Classes</H2>
      <Button mode="text" labelStyle={styles.viewAllButton}>
        See All
      </Button>
    </View>
    <Body color="#666666">
      You have 3 upcoming classes this week
    </Body>
    <Button 
      mode="contained" 
      style={styles.primaryButton}
      labelStyle={styles.primaryButtonLabel}
    >
      Book Now
    </Button>
  </Card.Content>
</Card>
```

### Status Display
```jsx
<StatusChip 
  status="success" 
  text="Active Subscription" 
  icon="check-circle" 
/>
<StatusChip 
  status="warning" 
  text="Payment Due" 
  icon="warning" 
/>
<StatusChip 
  status="neutral" 
  text="Pending" 
  icon="clock" 
/>
```

---

## Implementation Notes

### File Structure
```
constants/
  Colors.ts           // Color definitions
components/ui/
  Typography.tsx      // Text components
  StatusChip.tsx      // Status indicators
  Button.tsx          // Button components
  Card.tsx           // Card components
```

### Theme Integration
```typescript
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

const theme = useColorScheme() ?? 'light';
const colors = Colors[theme];
```

### Responsive Design
- Use Flexbox for layout
- Implement responsive spacing
- Test on multiple screen sizes
- Consider tablet and desktop layouts

---

## Brand Guidelines

### Logo Usage
- Maintain clear space around logo
- Use on appropriate backgrounds
- Ensure proper contrast ratios

### Voice and Tone
- **Welcoming**: Warm and inviting language
- **Professional**: Clear and informative
- **Encouraging**: Positive and motivating
- **Accessible**: Simple and understandable

### Photography Style
- Natural lighting
- Warm color tones
- Focus on movement and wellness
- Authentic and diverse representation

---

## Maintenance

### Regular Reviews
- Quarterly design system audits
- User feedback integration
- Performance optimization
- Accessibility compliance checks

### Version Control
- Document all changes
- Maintain backward compatibility
- Test across all platforms
- Update documentation regularly

---

*This style guide is a living document that evolves with the ANIMO Pilates Studio app. For questions or suggestions, please refer to the development team.* 