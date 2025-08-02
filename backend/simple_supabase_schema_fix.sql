-- SIMPLE Supabase PostgreSQL Schema Fix 
-- No stupid decimals - just duration + unit!

-- Step 1: Add simple duration columns
ALTER TABLE subscription_plans 
ADD COLUMN duration INTEGER NOT NULL DEFAULT 1,
ADD COLUMN duration_unit VARCHAR(10) CHECK(duration_unit IN ('days', 'months', 'years')) NOT NULL DEFAULT 'months';

-- Step 2: Convert existing data (all are 1 month)
UPDATE subscription_plans 
SET duration = 1, duration_unit = 'months';

-- Step 3: Drop the stupid decimal column
ALTER TABLE subscription_plans 
DROP COLUMN duration_months;

-- Step 4: Add helpful comments
COMMENT ON COLUMN subscription_plans.duration IS 'Plan duration as simple integer (1, 7, 12, etc)';
COMMENT ON COLUMN subscription_plans.duration_unit IS 'Duration unit: days, months, or years';

-- Verify the changes
SELECT name, duration, duration_unit 
FROM subscription_plans 
ORDER BY id;