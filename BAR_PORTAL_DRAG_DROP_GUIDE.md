# Bar Portal - Drag & Drop Product Layout

## 🎯 Feature Overview

The Dashboard products now support **drag-and-drop** functionality, allowing reception staff to customize the product card layout according to their preferences. This makes it easier to position frequently-used products in convenient locations.

---

## ✨ How It Works

### 1. **Drag Products**
- **Click and Hold**: Click on any product card and hold the mouse button
- **Drag**: Move the card to the desired position
- **Drop**: Release the mouse button to place the card

### 2. **Visual Feedback**
When dragging a product card:
- **Opacity**: Card becomes semi-transparent (50%)
- **Scale**: Card shrinks slightly (95%)
- **Border**: Dashed blue border appears
- **Shadow**: Enhanced shadow effect
- **Cursor**: Changes to "grabbing" hand icon
- **Drag Handle**: "⋮⋮" icon in top-right corner indicates draggability

### 3. **Persistent Layout**
- **Auto-Save**: Layout is automatically saved to browser localStorage
- **Persists**: Layout remains after page refresh or logout
- **Per-Device**: Each computer/browser remembers its own layout
- **Reset Option**: "🔄 Reset Layout" button appears when custom order exists

---

## 🎨 Visual Design

### Product Card States

#### Normal State
```
┌─────────────────────┐
│ Product Name    ⋮⋮  │
│                     │
│      €12.50         │
│                     │
│   beverage          │
│   Stock: 25         │
└─────────────────────┘
Cursor: grab (hand)
```

#### Dragging State
```
┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐
│ Product Name    ⋮⋮  │ (50% opacity)
│                     │
│      €12.50         │ (Dashed border)
│                     │ (Enhanced shadow)
│   beverage          │
│   Stock: 25         │
└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘
Cursor: grabbing
```

### Helper Elements

#### Tip Banner
```
┌─────────────────────────────────────────────┐
│ ✋  Tip: Drag and drop products to          │
│     rearrange them to your preference!      │
└─────────────────────────────────────────────┘
Blue background, appears above product grid
```

#### Reset Button
```
┌──────────────────┐
│ 🔄 Reset Layout  │  ← Orange button
└──────────────────┘
Only visible when custom order exists
```

---

## 💾 Technical Details

### Data Storage
- **Location**: Browser localStorage
- **Key**: `barProductOrder`
- **Format**: JSON array of product IDs `[3, 1, 5, 2, 4]`
- **Size**: Minimal (~50 bytes for typical setup)

### How Ordering Works
1. **Default**: Products shown in database order
2. **Custom Order**: Products rearranged based on saved ID order
3. **New Products**: Automatically appear at the end
4. **Removed Products**: Automatically excluded from saved order

### Example localStorage Data
```json
{
  "barProductOrder": [15, 3, 8, 1, 12, 7, 4, 9, 2]
}
```
This means:
- Product ID 15 shows first
- Product ID 3 shows second
- Product ID 8 shows third
- etc.

---

## 🎯 Use Cases

### Popular Arrangements

#### 1. **By Frequency**
Most-sold products at the top:
```
☕ Coffee      🥤 Water       🍪 Cookie
🥐 Croissant   🍫 Chocolate   🧃 Juice
🥗 Salad       🍕 Pizza       🌮 Wrap
```

#### 2. **By Category**
Group similar products together:
```
Beverages ──────────────┐
☕ Coffee  🥤 Water  🧃 Juice

Snacks ─────────────────┐
🍪 Cookie  🥐 Croissant  🍫 Chocolate

Meals ──────────────────┐
🥗 Salad  🍕 Pizza  🌮 Wrap
```

#### 3. **By Price**
Expensive items first (upselling):
```
💎 Premium Items
🍾 Champagne  €45.00
🥩 Steak      €35.00

💰 Mid-Range
🍕 Pizza      €12.00

💵 Budget
🍪 Cookie     €3.50
```

#### 4. **Custom Workflow**
Arranged for specific reception workflows:
```
Quick Grab Items (Left)    Main Meals (Right)
☕ Coffee                   🍕 Pizza
🥤 Water                    🥗 Salad
🍪 Cookie                   🌮 Wrap
```

---

## 🔄 Reset Layout

### When to Reset
- Starting a new shift
- Testing different arrangements
- Reverting to default database order
- After major product changes

### How to Reset
1. Click "🔄 Reset Layout" button (top-right, next to search)
2. Layout immediately returns to default database order
3. Button disappears (no custom order to reset)
4. localStorage is cleared

### What Happens
```
Before Reset:
[Custom Order] → Product IDs: 15, 3, 8, 1, 12...

After Reset:
[Default Order] → Database order
localStorage cleared
```

---

## 🎓 User Training

### For Reception Staff

**Quick Start:**
1. Open Bar Portal → Dashboard
2. See blue tip: "Drag and drop products..."
3. Click and hold any product card
4. Move it to desired position
5. Release to drop
6. Layout automatically saved!

**Tips:**
- ✅ Arrange most-used items at top-left
- ✅ Group similar products together
- ✅ Put drinks separate from food
- ✅ Popular items in easy-to-reach spots
- ✅ Seasonal items can be prominently placed

**Common Mistakes:**
- ❌ Don't click too fast (needs a hold)
- ❌ Drag handle (⋮⋮) is visual only, grab anywhere
- ❌ Can't drag while searching (clear search first)

---

## 🔧 Troubleshooting

### Issue: Cards won't drag
**Solution:** 
- Clear the search box first
- Make sure you're clicking and holding
- Refresh the page

### Issue: Layout not saving
**Solution:**
- Check browser allows localStorage
- Not in incognito/private mode
- Browser storage not full

### Issue: Want different layout per staff member
**Current:** Layout is per-browser, not per-user
**Workaround:** 
- Each staff uses different browser/computer
- Or manually rearrange at start of shift

### Issue: New products appear in wrong place
**Expected Behavior:** New products appear at the end
**Solution:** Drag them to preferred position once

---

## 💡 Best Practices

### Optimal Layouts

#### **Busy Periods**
```
Position fastest items first:
1. Water (instant)
2. Coffee (quick)
3. Prepackaged snacks
4. ...then prepared items
```

#### **Quiet Periods**
```
Position upsell items first:
1. Premium drinks
2. Meal combos
3. Desserts
4. ...then basics
```

#### **Event Days**
```
Position event-specific items:
1. Party platters
2. Bulk drinks
3. Group snacks
4. ...then regular items
```

---

## 📱 Multi-Device Considerations

### Desktop PC
- ✅ Full drag-and-drop support
- ✅ Smooth animations
- ✅ Large click target areas

### Tablet
- ✅ Touch-drag supported
- ✅ Larger cards easier to grab
- ⚠️ May need more deliberate holds

### Mobile
- ⚠️ Small screen, harder to arrange
- ⚠️ Consider mobile-first layouts
- 💡 Better to arrange on desktop then use mobile

---

## 🎨 Customization Examples

### Example 1: Morning Rush Setup
```
Row 1: ☕ Coffee  ☕ Cappuccino  🥐 Croissant
Row 2: 🧃 Juice   🥤 Water      🍪 Cookie
Row 3: [Less popular items...]
```

### Example 2: Lunch Service
```
Row 1: 🍕 Pizza   🥗 Salad      🌮 Wrap
Row 2: 🥤 Water   🧃 Juice      ☕ Coffee
Row 3: 🍪 Cookie  🍫 Chocolate  🥐 Croissant
```

### Example 3: Profit-Focused
```
Row 1: 💰 High-margin items
Row 2: 📊 Medium-margin items
Row 3: 💵 Low-margin items
```

---

## 🚀 Future Enhancements

Potential improvements for later:

1. **Save Multiple Layouts**
   - "Morning Layout"
   - "Lunch Layout"
   - "Evening Layout"
   - Quick switch between them

2. **Per-User Layouts**
   - Each staff member's preferences
   - Auto-load on login

3. **Layout Sharing**
   - Export layout to file
   - Import colleague's layout
   - Manager-approved layouts

4. **Smart Suggestions**
   - AI suggests optimal layout based on sales
   - "Most popular items first" auto-sort
   - Category auto-grouping

5. **Analytics**
   - Track which layouts sell more
   - A/B test different arrangements
   - Optimize based on data

---

## 📊 Technical Implementation

### Code Structure
```typescript
// State Management
const [draggedProductId, setDraggedProductId] = useState<number | null>(null);
const [productOrder, setProductOrder] = useState<number[]>([]);

// Drag Handlers
- handleDragStart(productId)
- handleDragOver(e, productId)
- handleDragEnd()

// Sorting Logic
- sortedDashboardProducts = computed based on productOrder

// Persistence
- localStorage.getItem('barProductOrder')
- localStorage.setItem('barProductOrder', JSON.stringify(order))
```

### Event Flow
```
1. User grabs card
   └─> onDragStart() → setDraggedProductId(id)

2. User drags over another card
   └─> onDragOver() → Reorder array → Save to localStorage

3. User releases
   └─> onDragEnd() → Clear draggedProductId

4. Component re-renders
   └─> sortedDashboardProducts → Display in new order
```

---

## ✅ Testing Checklist

- [x] Drag a card to new position
- [x] Drop card successfully
- [x] Layout persists after page refresh
- [x] Visual feedback during drag (opacity, border, shadow)
- [x] Cursor changes (grab → grabbing)
- [x] Reset button appears when custom order exists
- [x] Reset button clears layout
- [x] Works with search filter
- [x] New products appear at end
- [x] No errors in console
- [x] No linting errors

---

## 📝 Summary

**What Was Added:**
- ✅ Full drag-and-drop support for product cards
- ✅ Visual feedback during dragging
- ✅ Persistent layout (localStorage)
- ✅ Reset layout button
- ✅ Helper tip banner
- ✅ Smooth animations
- ✅ Grab handle indicator (⋮⋮)

**Benefits:**
- 🚀 Faster product selection
- 🎯 Personalized workflow
- 💡 Improved efficiency
- 😊 Better user experience
- 📊 Optimized for sales patterns

**Files Modified:**
- `src/screens/reception/BarPortalWeb.tsx`

**Lines Added:** ~100 lines
**No Breaking Changes:** Fully backward compatible

---

**Created:** October 2025  
**Status:** ✅ Complete and Tested  
**Feature Type:** UX Enhancement

