-- Create client_notes table in Supabase
-- Run this SQL in your Supabase Dashboard > SQL Editor

CREATE TABLE client_notes (
  id SERIAL PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note_type TEXT CHECK(note_type IN ('general', 'medical', 'billing', 'behavior', 'retention', 'complaint', 'compliment')) DEFAULT 'general',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT CHECK(priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  is_private BOOLEAN DEFAULT false,
  tags TEXT,
  reminder_at TIMESTAMP WITH TIME ZONE,
  reminder_message TEXT,
  reminder_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_client_notes_client_id ON client_notes(client_id);
CREATE INDEX idx_client_notes_created_by ON client_notes(created_by);
CREATE INDEX idx_client_notes_type ON client_notes(note_type);
CREATE INDEX idx_client_notes_priority ON client_notes(priority);
CREATE INDEX idx_client_notes_created_at ON client_notes(created_at); 