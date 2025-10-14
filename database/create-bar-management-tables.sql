-- =====================================================
-- BAR MANAGEMENT SYSTEM - SUPABASE TABLES
-- =====================================================
-- Creates tables for: Products, Tables, Orders, Sales
-- =====================================================

-- 1. BAR PRODUCTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS bar_products (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  cost DECIMAL(10, 2) DEFAULT 0 CHECK (cost >= 0),
  category VARCHAR(100) NOT NULL DEFAULT 'beverage',
  stock INTEGER DEFAULT 0 CHECK (stock >= 0),
  image_url TEXT,
  description TEXT,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. BAR TABLES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS bar_tables (
  id BIGSERIAL PRIMARY KEY,
  table_number VARCHAR(50) NOT NULL UNIQUE,
  status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved')),
  capacity INTEGER DEFAULT 4,
  opened_at TIMESTAMPTZ,
  linked_client_id UUID, -- Client ID from studio database (no FK constraint)
  linked_client_name VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. BAR ORDERS TABLE (Items in current table orders)
-- =====================================================
CREATE TABLE IF NOT EXISTS bar_orders (
  id BIGSERIAL PRIMARY KEY,
  table_id BIGINT REFERENCES bar_tables(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES bar_products(id) ON DELETE SET NULL,
  product_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10, 2) NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'served', 'cancelled')),
  ordered_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. BAR SALES TABLE (Completed/Closed sales)
-- =====================================================
CREATE TABLE IF NOT EXISTS bar_sales (
  id BIGSERIAL PRIMARY KEY,
  table_number VARCHAR(50) NOT NULL,
  table_id BIGINT,
  client_id UUID, -- Client ID from studio database (no FK constraint)
  client_name VARCHAR(255),
  items JSONB NOT NULL, -- Array of {product_name, quantity, unit_price, total}
  subtotal DECIMAL(10, 2) NOT NULL,
  discount DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(50) DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'digital', 'credit')),
  payment_status VARCHAR(20) DEFAULT 'completed' CHECK (payment_status IN ('pending', 'completed', 'refunded')),
  served_by_staff_id UUID, -- Staff ID from studio database (no FK constraint)
  served_by_staff_name VARCHAR(255),
  sale_date TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. BAR INVENTORY HISTORY (Stock movements)
-- =====================================================
CREATE TABLE IF NOT EXISTS bar_inventory_history (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT REFERENCES bar_products(id) ON DELETE CASCADE,
  product_name VARCHAR(255) NOT NULL,
  movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('purchase', 'sale', 'adjustment', 'waste')),
  quantity_change INTEGER NOT NULL,
  stock_before INTEGER NOT NULL,
  stock_after INTEGER NOT NULL,
  cost_per_unit DECIMAL(10, 2),
  total_cost DECIMAL(10, 2),
  reason TEXT,
  performed_by_staff_id UUID, -- Staff ID from studio database (no FK constraint)
  performed_by_staff_name VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_bar_products_category ON bar_products(category);
CREATE INDEX IF NOT EXISTS idx_bar_products_available ON bar_products(is_available);
CREATE INDEX IF NOT EXISTS idx_bar_tables_status ON bar_tables(status);
CREATE INDEX IF NOT EXISTS idx_bar_tables_client ON bar_tables(linked_client_id);
CREATE INDEX IF NOT EXISTS idx_bar_orders_table ON bar_orders(table_id);
CREATE INDEX IF NOT EXISTS idx_bar_orders_status ON bar_orders(status);
CREATE INDEX IF NOT EXISTS idx_bar_sales_date ON bar_sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_bar_sales_client ON bar_sales(client_id);
CREATE INDEX IF NOT EXISTS idx_bar_sales_payment ON bar_sales(payment_method);
CREATE INDEX IF NOT EXISTS idx_bar_inventory_product ON bar_inventory_history(product_id);
CREATE INDEX IF NOT EXISTS idx_bar_inventory_date ON bar_inventory_history(created_at);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Trigger to update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION update_bar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bar_products_updated_at
  BEFORE UPDATE ON bar_products
  FOR EACH ROW
  EXECUTE FUNCTION update_bar_updated_at();

CREATE TRIGGER bar_tables_updated_at
  BEFORE UPDATE ON bar_tables
  FOR EACH ROW
  EXECUTE FUNCTION update_bar_updated_at();

-- Trigger to log inventory changes when stock is updated
CREATE OR REPLACE FUNCTION log_bar_inventory_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.stock != NEW.stock THEN
    INSERT INTO bar_inventory_history (
      product_id,
      product_name,
      movement_type,
      quantity_change,
      stock_before,
      stock_after,
      cost_per_unit,
      total_cost
    ) VALUES (
      NEW.id,
      NEW.name,
      CASE 
        WHEN NEW.stock > OLD.stock THEN 'purchase'
        WHEN NEW.stock < OLD.stock THEN 'sale'
        ELSE 'adjustment'
      END,
      NEW.stock - OLD.stock,
      OLD.stock,
      NEW.stock,
      NEW.cost,
      ABS(NEW.stock - OLD.stock) * NEW.cost
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bar_products_stock_change
  AFTER UPDATE ON bar_products
  FOR EACH ROW
  EXECUTE FUNCTION log_bar_inventory_change();

-- =====================================================
-- RLS (ROW LEVEL SECURITY) POLICIES
-- =====================================================
-- Note: Since this is a separate database from studio,
-- we allow all authenticated users to access bar data.
-- Access control is handled at the application level.
-- =====================================================

-- Enable RLS
ALTER TABLE bar_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE bar_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE bar_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE bar_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE bar_inventory_history ENABLE ROW LEVEL SECURITY;

-- Allow both anon and authenticated users full access
-- (Bar is experimental, access control handled at app level)
CREATE POLICY "bar_products_anon" ON bar_products FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "bar_products_auth" ON bar_products FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "bar_tables_anon" ON bar_tables FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "bar_tables_auth" ON bar_tables FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "bar_orders_anon" ON bar_orders FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "bar_orders_auth" ON bar_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "bar_sales_anon" ON bar_sales FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "bar_sales_auth" ON bar_sales FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "bar_inventory_anon" ON bar_inventory_history FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "bar_inventory_auth" ON bar_inventory_history FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =====================================================
-- SEED DATA
-- =====================================================

-- Insert default products
INSERT INTO bar_products (name, price, cost, category, stock) VALUES
  ('Water 500ml', 2.50, 1.00, 'beverage', 100),
  ('Sparkling Water', 3.00, 1.20, 'beverage', 80),
  ('Coffee Espresso', 2.00, 0.50, 'beverage', 200),
  ('Coffee Cappuccino', 3.00, 0.80, 'beverage', 200),
  ('Coffee Latte', 3.50, 0.90, 'beverage', 200),
  ('Fresh Juice', 4.00, 1.50, 'beverage', 50),
  ('Energy Drink', 4.50, 2.00, 'beverage', 60),
  ('Protein Shake', 6.00, 2.50, 'beverage', 40),
  ('Protein Bar', 4.00, 2.00, 'snack', 50),
  ('Granola Bar', 3.00, 1.20, 'snack', 60),
  ('Nuts Mix', 4.50, 2.00, 'snack', 40),
  ('Fruit Salad', 5.00, 2.50, 'snack', 30),
  ('Sandwich', 6.50, 3.00, 'snack', 25),
  ('Yoga Mat', 45.00, 25.00, 'accessory', 15),
  ('Resistance Band', 15.00, 8.00, 'accessory', 20),
  ('Water Bottle', 12.00, 6.00, 'accessory', 30),
  ('Pilates Ring', 35.00, 18.00, 'accessory', 10),
  ('Foam Roller', 40.00, 22.00, 'accessory', 12),
  ('Workout Towel', 8.00, 4.00, 'accessory', 50),
  ('Creatine', 35.00, 18.00, 'supplement', 20),
  ('BCAA', 30.00, 15.00, 'supplement', 25),
  ('Pre-Workout', 38.00, 20.00, 'supplement', 18),
  ('Vitamin C', 20.00, 10.00, 'supplement', 35),
  ('Magnesium', 22.00, 11.00, 'supplement', 30)
ON CONFLICT DO NOTHING;

-- Insert default tables (12 tables)
INSERT INTO bar_tables (table_number, status, capacity) VALUES
  ('Table 1', 'available', 2),
  ('Table 2', 'available', 2),
  ('Table 3', 'available', 4),
  ('Table 4', 'available', 4),
  ('Table 5', 'available', 4),
  ('Table 6', 'available', 4),
  ('Table 7', 'available', 6),
  ('Table 8', 'available', 6),
  ('Table 9', 'available', 2),
  ('Table 10', 'available', 2),
  ('Table 11', 'available', 8),
  ('Table 12', 'available', 8)
ON CONFLICT (table_number) DO NOTHING;

-- =====================================================
-- VIEWS FOR REPORTING
-- =====================================================

-- Daily sales summary
CREATE OR REPLACE VIEW bar_daily_sales AS
SELECT 
  DATE(sale_date) as sale_day,
  COUNT(*) as total_sales,
  SUM(total) as total_revenue,
  SUM(subtotal - discount) as net_revenue,
  AVG(total) as avg_sale_amount,
  COUNT(DISTINCT client_id) as unique_clients
FROM bar_sales
GROUP BY DATE(sale_date)
ORDER BY sale_day DESC;

-- Product performance
CREATE OR REPLACE VIEW bar_product_performance AS
SELECT 
  p.id,
  p.name,
  p.category,
  p.price,
  p.cost,
  p.stock,
  (p.price - p.cost) as profit_margin,
  COALESCE(sales_count.total_sold, 0) as total_sold,
  COALESCE(sales_count.revenue, 0) as total_revenue,
  COALESCE(sales_count.profit, 0) as total_profit
FROM bar_products p
LEFT JOIN (
  SELECT 
    product_id,
    COUNT(*) as total_sold,
    SUM(total_price) as revenue,
    SUM(total_price - (quantity * (SELECT cost FROM bar_products WHERE id = product_id))) as profit
  FROM bar_orders
  WHERE status = 'served'
  GROUP BY product_id
) sales_count ON p.id = sales_count.product_id
ORDER BY total_revenue DESC;

-- Current table status
CREATE OR REPLACE VIEW bar_current_table_status AS
SELECT 
  t.id,
  t.table_number,
  t.status,
  t.capacity,
  t.linked_client_name,
  t.opened_at,
  COALESCE(order_summary.item_count, 0) as items_count,
  COALESCE(order_summary.total_amount, 0) as current_total
FROM bar_tables t
LEFT JOIN (
  SELECT 
    table_id,
    COUNT(*) as item_count,
    SUM(total_price) as total_amount
  FROM bar_orders
  WHERE status = 'pending'
  GROUP BY table_id
) order_summary ON t.id = order_summary.table_id
ORDER BY t.table_number;

COMMENT ON TABLE bar_products IS 'Bar products/items available for sale';
COMMENT ON TABLE bar_tables IS 'Physical tables in the bar area';
COMMENT ON TABLE bar_orders IS 'Individual items ordered per table (pending orders)';
COMMENT ON TABLE bar_sales IS 'Completed sales transactions';
COMMENT ON TABLE bar_inventory_history IS 'Stock movement tracking and history';

