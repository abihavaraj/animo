-- Add notes column to bar_orders table
-- This allows reception staff to add special instructions to orders

ALTER TABLE bar_orders 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add comment for documentation
COMMENT ON COLUMN bar_orders.notes IS 'Special instructions or notes for the order (e.g., "No ice", "Extra hot", allergen info)';

-- Optional: Add index for searching orders by notes
CREATE INDEX IF NOT EXISTS idx_bar_orders_notes ON bar_orders(notes) WHERE notes IS NOT NULL;

