-- Add cancelled_by column to bookings table
-- This column will track who cancelled the booking: 'user', 'reception', or 'studio'

ALTER TABLE bookings 
ADD COLUMN cancelled_by TEXT;

-- Add a comment to explain the column
COMMENT ON COLUMN bookings.cancelled_by IS 'Tracks who cancelled the booking: user, reception, or studio';

-- Create an index for better query performance
CREATE INDEX idx_bookings_cancelled_by ON bookings(cancelled_by);
