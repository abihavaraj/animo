# 🍷 Separate Supabase Project for Bar Management

## Why Separate Projects?

### ✅ **Benefits:**
1. **Zero Risk to Studio Data** - Bar experiments can't break your core business
2. **Independent Scaling** - Bar usage doesn't slow down studio operations  
3. **Cost Tracking** - See exactly what bar system costs
4. **Development Freedom** - Test wild ideas without fear
5. **Clean Architecture** - Clear separation of concerns

### ⚠️ **Single Drawback:**
- Need to manage two database connections in code (easy to handle)

---

## 🚀 Setup Instructions (10 minutes)

### Step 1: Create New Supabase Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Settings:
   - **Name**: `Bar Management`
   - **Database Password**: (choose strong password - SAVE IT!)
   - **Region**: Same as studio (for consistency)
   - **Pricing Plan**: Free tier is fine for bar
4. Wait 2-3 minutes for project creation

### Step 2: Get Bar Project Credentials

1. In new "Bar Management" project dashboard:
2. Go to **Settings** → **API**
3. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJhbG...` (long key)

### Step 3: Create Tables in Bar Project

1. In Bar Management project, go to **SQL Editor**
2. Click **"New Query"**
3. Copy entire contents of `database/create-bar-management-tables.sql`
4. Paste and click **"Run"**
5. ✅ You should see: "Success. No rows returned"

### Step 4: Configure Environment Variables

Add to your `.env` file (create if doesn't exist):

```env
# ====== STUDIO SUPABASE (Existing - DON'T CHANGE) ======
EXPO_PUBLIC_SUPABASE_URL=https://byhqueksdwlbiwodpbbd.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ====== BAR SUPABASE (New - Add These) ======
EXPO_PUBLIC_BAR_SUPABASE_URL=https://[YOUR-BAR-PROJECT-ID].supabase.co
EXPO_PUBLIC_BAR_SUPABASE_ANON_KEY=eyJhbG... [YOUR BAR ANON KEY]
```

**Replace** `[YOUR-BAR-PROJECT-ID]` and `[YOUR BAR ANON KEY]` with values from Step 2.

### Step 5: Update Bar Service

Update `src/services/barService.ts` to use bar config:

```typescript
// Change this line:
import { supabase } from '../config/supabase.config';

// To this:
import { barSupabase as supabase, isBarConfigured } from '../config/supabase.bar.config';
// Fallback to studio supabase if bar not configured
import { supabase as studioSupabase } from '../config/supabase.config';

const db = isBarConfigured() ? supabase : studioSupabase;

// Then use 'db' instead of 'supabase' in all queries
```

### Step 6: Restart Development Server

```bash
# Stop current server (Ctrl+C)
# Clear cache and restart
npm start -- --clear
```

---

## 🔧 Code Structure with Two Projects

```typescript
// Studio Operations (existing)
import { supabase } from '../config/supabase.config';
const { data } = await supabase.from('users').select('*');

// Bar Operations (new)
import { barSupabase } from '../config/supabase.bar.config';
const { data } = await barSupabase.from('bar_products').select('*');
```

---

## 📊 What Goes Where?

### **Studio Supabase** (Production - Don't Touch)
- ✅ users
- ✅ classes
- ✅ bookings
- ✅ subscriptions
- ✅ payments
- ✅ instructors
- ✅ staff_activities (includes bar activity logs!)
- ✅ All existing tables

### **Bar Supabase** (Experimental - Play Freely)
- 🍷 bar_products
- 🍷 bar_tables
- 🍷 bar_orders
- 🍷 bar_sales
- 🍷 bar_inventory_history

---

## 🔗 Linking Bar to Studio Clients

Even with separate databases, you can still link bar purchases to studio clients!

### How it Works:
1. **Client Search** still uses Studio database
2. **Activity Logging** still goes to Studio's `staff_activities` table
3. **Bar Transactions** stored in Bar database
4. **Link via `client_id`** (UUID from studio users table)

```typescript
// Search clients from STUDIO database
const { data: clients } = await supabase
  .from('users')
  .select('id, name, email')
  .eq('role', 'client');

// Save sale to BAR database with client_id reference
await barSupabase.from('bar_sales').insert({
  client_id: selectedClient.id,  // ← Links to studio user
  client_name: selectedClient.name,
  items: [...],
  total: 25.50
});

// Log activity to STUDIO database
await activityService.logActivity({
  client_id: selectedClient.id,  // ← Same ID
  activity_type: 'bar_order',
  metadata: { total: 25.50 }
});
```

**Result**: Client's profile in studio shows bar activity, but bar data stays isolated! 🎯

---

## 💰 Cost Comparison

### Free Tier Limits (per project):
- 500 MB database
- 1 GB file storage
- 2 GB data transfer/month
- Up to 50,000 monthly active users

### Recommended:
- **Studio**: Keep on Paid plan (if already)
- **Bar**: Start on Free tier
- **Total Cost**: Same or +$0 (until bar grows)

---

## 🎯 Migration Strategy

### Option A: Separate Now (Recommended)
- Create bar project today
- Start fresh with seed data
- All future bar data isolated

### Option B: Wait & Migrate Later
- Build in studio database now
- Create bar project when ready
- Migrate data later with SQL export/import

**Recommendation**: Do it NOW while there's no production bar data!

---

## 🔄 Fallback Strategy

The code is designed to gracefully fall back:

```typescript
// If bar project not configured, uses studio database
const db = isBarConfigured() ? barSupabase : studioSupabase;
```

This means:
- ✅ Works immediately even without bar project
- ✅ Can test locally with studio database
- ✅ Switch to bar project when ready
- ✅ Zero downtime migration

---

## 🛠️ Testing Checklist

After setup, verify:

- [ ] Bar products load in dashboard
- [ ] Can add new product
- [ ] Can create order on table
- [ ] Can close table and create sale
- [ ] Client search still works (uses studio DB)
- [ ] Activity logs to studio's staff_activities
- [ ] Sales appear in bar_sales table
- [ ] Stock decreases on sale

---

## 🚨 Troubleshooting

### "Unable to resolve barSupabase"
- Check `.env` file has BAR variables
- Restart dev server with `--clear`
- Verify import path in barService.ts

### "Table does not exist"
- Verify SQL script ran successfully
- Check you're in Bar project (not studio)
- Rerun `create-bar-management-tables.sql`

### "Row Level Security policy violation"
- Check RLS policies were created
- Verify user is authenticated
- Check role is 'admin' or 'reception'

---

## 📝 Summary

**Do This:**
1. ✅ Create separate Bar Supabase project
2. ✅ Run SQL to create tables
3. ✅ Add env variables
4. ✅ Update barService to use barSupabase
5. ✅ Test everything works

**Benefits:**
- 🛡️ Studio data is 100% protected
- 🚀 Experiment with bar freely
- 💰 Track costs separately
- 🎯 Clean architecture

**Time**: ~10 minutes setup
**Risk**: Zero (falls back to studio DB if not configured)
**Recommendation**: **DO IT!** 💯

