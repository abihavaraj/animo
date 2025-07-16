# ANIMO Pilates Studio

**Mobile Design System v1.1** · June 2025

> A single source of truth for designers & engineers building the ANIMO Pilates experience on **iOS** and **Android**.

---

## 1 · Design Principles

| Principle                 | What it means in practice                                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Minimal, not sterile**  | Large white (or near‑white) surfaces, 1 accent color, restrained iconography. Remove anything that doesn’t guide a user action. |
| **Warm & human**          | Soft neutrals, generous corner‑radii (16 px), micro‑shadows (1–2 dp), subtle motion.                                            |
| **Predictable**           | Every screen follows the same header ➜ content ➜ CTAs ➜ nav order. Elements never jump positions between tabs.                  |
| **Accessible from day 1** | WCAG 2.2 AA color contrast, ≥ 44 × 44 px touch targets, motion‐safe prefers‑reduced‑motion fallbacks.                           |
| **Theme‑aware**           | Light & Dark palettes share logic: identical hue roles, identical semantic names.                                               |

---

\## 2 · Color Palette

### 2.1 Brand & Neutrals

```ts
export const Colors = {
  neutralWhite:  '#FFFFFF',    // Card / Surface 00
  softBeige:     '#F8F6F3',    // App background 01
  warmTaupe:     '#9B8A7D',    // Brand primary 02
  charcoal:      '#2C2C2C',    // Primary text  
};
```

\### 2.2 Accent & States

```ts
export const Accent  = '#6B8E7F';   // Primary CTAs, Success
export const Warning = '#D4A574';   // Pending / Alert
export const Error   = '#C47D7D';   // Destructive, Validation
```

> **Rule of three**: Every screen should show *max three* distinct hues: background neutral + brand or text neutral + optional accent/state.

\### 2.3 Light / Dark Roles

| Role               | Light                   | Dark                    |
| ------------------ | ----------------------- | ----------------------- |
| Background         | `softBeige`             | `#1A1A1A`               |
| Surface 00 (cards) | `neutralWhite`          | `#2C2C2C`               |
| Border             | `#E8E6E3`               | `#444444`               |
| Text / Primary     | `charcoal`              | `softBeige`             |
| Text / Secondary   | `#666666`               | `#CCCCCC`               |
| Disabled Text      | `#999999`               | `#777777`               |
| CTA / Primary      | `Accent`                | `Accent`                |
| Success chip       | `rgba(107,142,127,0.1)` | `rgba(107,142,127,0.2)` |

---

\## 3 · Typography

| Token       | Size  | Line  | Weight | Usage                   |
| ----------- | ----- | ----- | ------ | ----------------------- |
| **H1**      | 24 px | 30 px | 700    | Page titles             |
| **H2**      | 20 px | 26 px | 600    | Section / Card headers  |
| **H3**      | 18 px | 24 px | 600    | Sub‑section headers     |
| **Body**    | 16 px | 22 px | 400    | Long‑form copy          |
| **Caption** | 14 px | 20 px | 500    | Supporting text, labels |
| **Small**   | 12 px | 16 px | 500    | Meta info, helper text  |

*Typeface:* `SF Pro / Roboto` system stack. Never mix other fonts.

---

\## 4 · Spacing & Grid

| Token  | px | Typical use                       |
| ------ | -- | --------------------------------- |
| **xs** | 4  | Icon separation                   |
| **sm** | 8  | Tight element gaps                |
| **md** | 16 | Default padding inside components |
| **lg** | 24 | Vertical spacing between sections |
| **xl** | 32 | Page‑level margin                 |

* Mobile grid: **1 column**, 16 px side gutters, 8 px baseline.
* Tablet ≥ 768 dp: **2 columns**, 24 px gutters.

---

\## 5 · Elevation & Corners

| Level     | dp | Shadow (iOS)                      |
| --------- | -- | --------------------------------- |
| **Card**  | 1  | `rgba(0,0,0,0.06)` offset 0 1 2 2 |
| **Modal** | 3  | `rgba(0,0,0,0.10)` offset 0 2 6 4 |

*Corner radius everywhere:* **16 px**. Do **NOT** decrease below 12 px.

---

\## 6 · Component Recipes

### 6.1 Card

```ts
export const Card = {
  backgroundColor: Colors.neutralWhite,
  borderRadius: 16,
  padding: spacing.md,
  gap: spacing.sm,
  borderWidth: 1,
  borderColor: Colors.border,
  elevation: 1,
};
```

\### 6.2 Buttons

| Variant         | BG             | Text           | Border         |
| --------------- | -------------- | -------------- | -------------- |
| **Primary**     | `Accent`       | `neutralWhite` | none           |
| **Secondary**   | `neutralWhite` | `charcoal`     | 1 px `#E8E6E3` |
| **Destructive** | `Error`        | `neutralWhite` | none           |

Padding: 12 px × 24 px, radius 16 px.

\### 6.3 Status Chip

```ts
export const Chip = {
  radius: 12,
  height: 28,
  paddingHorizontal: 12,
  textStyle: Small,
};
```

| State   | BG                   | Border               | Text      |
| ------- | -------------------- | -------------------- | --------- |
| Success | `rgba(Accent,0.08)`  | `rgba(Accent,0.16)`  | `Accent`  |
| Warning | `rgba(Warning,0.12)` | `rgba(Warning,0.24)` | `Warning` |
| Neutral | `softBeige`          | `#E8E6E3`            | `#666666` |

---

\## 7 · Navigation

### 7.1 Tab Bar

* Height 60 px (includes safe‑area).
* Icon 24 px. Label Small (12 px). Hidden on landscape phone.
* Active tint = `warmTaupe`; inactive = `#999999`.

\### 7.2 Header

```ts
headerStyle = {
  backgroundColor: Colors.warmTaupe,
  height: 60 + StatusBar.currentHeight,
  shadowOpacity: 0,
};
```

Title in **H2** style, color `neutralWhite`.

---

\## 8 · Motion

| Purpose                          | Duration | Curve                |
| -------------------------------- | -------- | -------------------- |
| Nav push / modal                 | 300 ms   | ease‑out             |
| Micro‑interaction (button press) | 100 ms   | ease‑in‑out          |
| Chip appear                      | 150 ms   | spring( damping 20 ) |

For reduced‑motion users, fade/scale only.

---

\## 9 · Accessibility

* Text/background contrast ≥ 4.5:1 (AA) — chips allowed 3:1 for large text.
* Touch area ≥ 44 × 44 px; 8 px min between controls.
* Focus outline: 2 px solid `Accent` (web) or system focus ring (native).

---

\## 10 · Usage Examples

```tsx
<Card>
  <H2>Your Classes</H2>
  <Body>You have 3 upcoming classes this week.</Body>
  <Button variant="primary" onPress={book}>Book Now</Button>
</Card>

<Chip state="success" icon="check">Confirmed</Chip>
```

---

\## 11 · File Structure

```
styles/
  Colors.ts     // Light & Dark tokens
  Typography.ts // Text components + scale
  Spacing.ts    // Grid & spacing helpers
components/
  Card.tsx
  Button.tsx
  Chip.tsx
```

---

\## 12 · Governance

* **Design review** every sprint (Fridays).
* **Audit** accessibility & visual QA each minor release.
* **Version bump** this doc on every token or guideline change.

> *ANIMO © 2025*  · Last updated 06 Jun 2025
