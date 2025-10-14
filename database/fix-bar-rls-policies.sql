-- =====================================================
-- FIX BAR RLS POLICIES - Allow Service Role Access
-- =====================================================
-- Since bar is separate from studio, we need to allow
-- access without checking studio's users table
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "bar_products_policy" ON bar_products;
DROP POLICY IF EXISTS "bar_tables_policy" ON bar_tables;
DROP POLICY IF EXISTS "bar_orders_policy" ON bar_orders;
DROP POLICY IF EXISTS "bar_sales_policy" ON bar_sales;
DROP POLICY IF EXISTS "bar_inventory_policy" ON bar_inventory_history;

-- Create new permissive policies
-- Allow anon and authenticated users full access
CREATE POLICY "bar_products_anon_policy" ON bar_products FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "bar_products_auth_policy" ON bar_products FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "bar_tables_anon_policy" ON bar_tables FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "bar_tables_auth_policy" ON bar_tables FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "bar_orders_anon_policy" ON bar_orders FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "bar_orders_auth_policy" ON bar_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "bar_sales_anon_policy" ON bar_sales FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "bar_sales_auth_policy" ON bar_sales FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "bar_inventory_anon_policy" ON bar_inventory_history FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "bar_inventory_auth_policy" ON bar_inventory_history FOR ALL TO authenticated USING (true) WITH CHECK (true);

