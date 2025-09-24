-- Add language_preference column to users table for notification localization
-- This will allow the system to store user language preferences in the database
-- instead of relying only on AsyncStorage

-- Add the column if it doesn't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS language_preference VARCHAR(5) DEFAULT 'en';

-- Create index for better performance when querying by language
CREATE INDEX IF NOT EXISTS idx_users_language_preference ON users(language_preference);

-- Update existing users to have English as default (they can change it in the app)
UPDATE users 
SET language_preference = 'en' 
WHERE language_preference IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN users.language_preference IS 'User preferred language for notifications (en=English, sq=Albanian, etc.)';

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name = 'language_preference';
