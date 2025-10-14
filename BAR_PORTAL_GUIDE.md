# Bar Portal - Complete Bar Management System

## Overview
The Bar Portal is a comprehensive bar management system integrated into the reception portal. It provides complete functionality for managing products, tables, sales, and finances.

## Access
- **Location**: Reception Dashboard → Bar Portal menu item
- **Icon**: 🍷 (local-bar)
- **File**: `src/screens/reception/BarPortal.tsx`
- **Platform**: PC only (optimized for desktop use)

## Features

### 1. Dashboard Tab
**Overview statistics and quick metrics**

- **Top Stats Cards**:
  - Today's Revenue (€)
  - Sales Today (count)
  - Occupied Tables (count)
  - Total Products (count)

- **Revenue Overview**:
  - This Week revenue
  - This Month revenue

- **Alerts**:
  - Low stock product warnings
  - Real-time notifications

### 2. Products Tab
**Complete product inventory management with CRUD operations**

#### Features:
- ✅ **Add New Products**: Name, sell price, cost price, category, stock
- ✅ **Edit Products**: Update any product details
- ✅ **Delete Products**: Remove products from inventory
- ✅ **Search**: Real-time product search by name
- ✅ **Filter by Category**: Beverage, Snack, Accessory, Supplement
- ✅ **Profit Calculation**: Automatic profit calculation (price - cost)
- ✅ **Stock Tracking**: Visual indicators for low stock (< 10 units)

#### Product Information Displayed:
- Product name
- Category
- Sell price
- Cost price
- Profit margin
- Current stock level
- Low stock warnings

### 3. Tables Tab
**Table management with order tracking and closing**

#### Features:
- ✅ **12 Tables**: Visual grid layout showing all tables
- ✅ **Table Status**: Available, Occupied, Reserved
- ✅ **Add Orders**: Select product and quantity for each table
- ✅ **Remove Orders**: Delete individual items from table
- ✅ **Table Total**: Live calculation of table bill
- ✅ **Close Table**: Complete payment and clear table
- ✅ **Payment Methods**: Cash, Card, Digital
- ✅ **Order Summary**: Detailed breakdown before closing

#### Table Card Shows:
- Table number
- Status (Available/Occupied)
- Number of items ordered
- Total amount due

#### Order Management:
1. Select a table
2. Add products with quantities
3. View live order list and total
4. Remove items if needed
5. Close table with payment method
6. Table automatically becomes available

### 4. Sales Tab
**Sales history and transaction records**

#### Features:
- ✅ **Sales List**: All completed transactions
- ✅ **Sale Details**: View complete order breakdown
- ✅ **Timestamps**: Date and time of each sale
- ✅ **Payment Method**: Track payment type used
- ✅ **Total Revenue**: Sum of all sales
- ✅ **Sales Count**: Number of transactions

#### Sale Information:
- Table number
- Date and time
- Items sold (with quantities)
- Total amount
- Payment method
- Order details

### 5. Finance Tab
**Revenue analytics and financial tracking**

#### Period Selection:
- Today
- Yesterday
- This Week
- This Month

#### Metrics Displayed:
- **Total Revenue**: All sales income
- **Total Cost**: Cost of goods sold
- **Net Profit**: Revenue - Cost
- **Sales Count**: Number of transactions
- **Average Sale**: Revenue / Sales count
- **Profit Margin**: (Profit / Revenue) × 100%

#### Summary View:
- Revenue breakdown
- Cost breakdown
- Net profit calculation
- Visual profit margin percentage

## Data Structure

### Product
```typescript
{
  id: number
  name: string
  price: number      // Sell price
  cost: number       // Cost price
  category: string   // beverage, snack, accessory, supplement
  stock: number      // Available units
}
```

### Table
```typescript
{
  id: number
  number: string           // "Table 1", "Table 2", etc.
  status: 'available' | 'occupied' | 'reserved'
  orders: TableOrder[]
  openedAt?: string        // Timestamp when first order added
}
```

### Table Order
```typescript
{
  id: number
  productId: number
  productName: string
  quantity: number
  price: number           // Unit price
  total: number          // quantity × price
}
```

### Sale
```typescript
{
  id: number
  tableNumber: string
  items: TableOrder[]
  total: number
  date: string           // ISO timestamp
  paymentMethod: 'cash' | 'card' | 'digital'
}
```

## Usage Flow

### Typical Workflow:

1. **Stock Management** (Products Tab):
   - Add products to inventory
   - Set prices and costs
   - Monitor stock levels
   - Restock when needed

2. **Customer Service** (Tables Tab):
   - Customer sits at table
   - Open table and add orders
   - Add/remove items as needed
   - View running total

3. **Payment** (Tables Tab):
   - Review order summary
   - Select payment method
   - Close table
   - Table becomes available

4. **Analytics** (Sales & Finance Tabs):
   - Review sales history
   - Track revenue by period
   - Monitor profit margins
   - Identify top products

## Design Features

### Visual Design:
- **Color-coded stats**: Green (revenue), Blue (sales), Orange (occupied), Purple (products)
- **Status indicators**: Visual badges for table availability
- **Low stock warnings**: Orange highlighting for products below threshold
- **Profit calculations**: Automatic profit display per product
- **Responsive grid**: Products and tables in optimized grid layouts

### User Experience:
- **One-click actions**: Quick add/edit/delete
- **Modal workflows**: Clean modal interfaces for complex actions
- **Search & filter**: Fast product lookup
- **Live totals**: Real-time calculation updates
- **Clear navigation**: Tab-based interface

## Future Enhancements (Potential)

### Possible Additions:
1. **Database Integration**: Save data to Supabase
2. **Receipt Printing**: Generate and print receipts
3. **Product Images**: Add product photos
4. **Categories Management**: Create custom categories
5. **Discount System**: Apply discounts to orders
6. **Tax Calculation**: Automatic tax on sales
7. **Reports Export**: PDF/Excel export of reports
8. **Inventory Alerts**: Automatic low stock notifications
9. **Multi-user**: Track which reception user made sale
10. **Shift Reports**: Opening/closing cash register counts

## Technical Details

### File Location:
- Main Component: `src/screens/reception/BarPortal.tsx`
- Navigation Integration: `src/screens/ReceptionDashboardWeb.tsx`

### Dependencies:
- React Native
- react-native-paper (Modal, Portal, TextInput)
- WebCompatibleIcon component

### State Management:
- Local state using React hooks
- Real-time calculations
- Mock data for demonstration (ready for database integration)

## Notes

- Currently uses mock data for demonstration
- All data stored in component state (resets on refresh)
- Ready for Supabase integration
- PC-optimized layouts
- No mobile optimization (reception use only)

---

**Created**: October 2025  
**Status**: ✅ Complete and functional  
**Platform**: PC/Web only

