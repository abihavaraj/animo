-- Instructor-Client Relationship Management
-- Migration: 002_instructor_client_relationships.sql

-- 1. Instructor-Client Assignments Table
CREATE TABLE IF NOT EXISTS instructor_client_assignments (
    id SERIAL PRIMARY KEY,
    instructor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assignment_type TEXT CHECK(assignment_type IN ('primary', 'secondary', 'temporary', 'consultation')) DEFAULT 'primary',
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    status TEXT CHECK(status IN ('active', 'inactive', 'completed', 'transferred')) DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(instructor_id, client_id, assignment_type)
);

-- 2. Client Progress Photos Table - for before/after photos by instructors
CREATE TABLE IF NOT EXISTS client_progress_photos (
    id SERIAL PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    instructor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    photo_type TEXT CHECK(photo_type IN ('before', 'after', 'progress', 'assessment')) NOT NULL,
    file_name TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_url TEXT NOT NULL, -- Supabase storage URL
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    description TEXT,
    body_area TEXT, -- e.g., 'full_body', 'posture', 'core', 'flexibility'
    measurement_data JSONB, -- JSON for measurements if any
    taken_date DATE DEFAULT CURRENT_DATE,
    session_notes TEXT,
    is_before_after_pair BOOLEAN DEFAULT FALSE,
    pair_id INTEGER, -- Links before/after photos
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Client Medical Info Updates - track medical condition updates by instructors
CREATE TABLE IF NOT EXISTS client_medical_updates (
    id SERIAL PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    instructor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    previous_conditions TEXT,
    updated_conditions TEXT NOT NULL,
    update_reason TEXT NOT NULL,
    severity_level TEXT CHECK(severity_level IN ('minor', 'moderate', 'significant', 'major')) DEFAULT 'minor',
    requires_clearance BOOLEAN DEFAULT FALSE,
    clearance_notes TEXT,
    effective_date DATE DEFAULT CURRENT_DATE,
    verified_by_admin UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    verification_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Client Progress Assessments - instructor assessments and notes
CREATE TABLE IF NOT EXISTS client_progress_assessments (
    id SERIAL PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    instructor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    assessment_date DATE DEFAULT CURRENT_DATE,
    assessment_type TEXT CHECK(assessment_type IN ('initial', 'monthly', 'quarterly', 'annual', 'injury_recovery', 'goal_review')) DEFAULT 'monthly',
    fitness_level TEXT CHECK(fitness_level IN ('beginner', 'intermediate', 'advanced', 'expert')) NOT NULL,
    flexibility_score INTEGER CHECK(flexibility_score BETWEEN 1 AND 10),
    strength_score INTEGER CHECK(strength_score BETWEEN 1 AND 10),
    balance_score INTEGER CHECK(balance_score BETWEEN 1 AND 10),
    endurance_score INTEGER CHECK(endurance_score BETWEEN 1 AND 10),
    technique_score INTEGER CHECK(technique_score BETWEEN 1 AND 10),
    goals_achieved JSONB, -- JSON array of completed goals
    new_goals JSONB, -- JSON array of new goals
    areas_of_improvement TEXT,
    recommended_classes JSONB, -- JSON array of recommended class types
    restrictions_notes TEXT,
    next_assessment_date DATE,
    overall_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_instructor_assignments_instructor ON instructor_client_assignments(instructor_id);
CREATE INDEX IF NOT EXISTS idx_instructor_assignments_client ON instructor_client_assignments(client_id);
CREATE INDEX IF NOT EXISTS idx_instructor_assignments_status ON instructor_client_assignments(status);
CREATE INDEX IF NOT EXISTS idx_instructor_assignments_type ON instructor_client_assignments(assignment_type);

CREATE INDEX IF NOT EXISTS idx_progress_photos_client ON client_progress_photos(client_id);
CREATE INDEX IF NOT EXISTS idx_progress_photos_instructor ON client_progress_photos(instructor_id);
CREATE INDEX IF NOT EXISTS idx_progress_photos_type ON client_progress_photos(photo_type);
CREATE INDEX IF NOT EXISTS idx_progress_photos_date ON client_progress_photos(taken_date);

CREATE INDEX IF NOT EXISTS idx_medical_updates_client ON client_medical_updates(client_id);
CREATE INDEX IF NOT EXISTS idx_medical_updates_instructor ON client_medical_updates(instructor_id);
CREATE INDEX IF NOT EXISTS idx_medical_updates_date ON client_medical_updates(effective_date);

CREATE INDEX IF NOT EXISTS idx_progress_assessments_client ON client_progress_assessments(client_id);
CREATE INDEX IF NOT EXISTS idx_progress_assessments_instructor ON client_progress_assessments(instructor_id);
CREATE INDEX IF NOT EXISTS idx_progress_assessments_date ON client_progress_assessments(assessment_date);
CREATE INDEX IF NOT EXISTS idx_progress_assessments_type ON client_progress_assessments(assessment_type);

-- Enable Row Level Security (RLS)
ALTER TABLE instructor_client_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_progress_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_medical_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_progress_assessments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for instructor_client_assignments
CREATE POLICY "Instructors can view their assigned clients" ON instructor_client_assignments
    FOR SELECT USING (
        auth.uid() = instructor_id OR 
        auth.uid() = client_id OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'reception'))
    );

CREATE POLICY "Admin and reception can manage assignments" ON instructor_client_assignments
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'reception'))
    );

-- RLS Policies for client_progress_photos
CREATE POLICY "Instructors can manage photos for their clients" ON client_progress_photos
    FOR ALL USING (
        auth.uid() = instructor_id OR
        auth.uid() = client_id OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'reception'))
    );

-- RLS Policies for client_medical_updates
CREATE POLICY "Instructors can manage medical updates for their clients" ON client_medical_updates
    FOR ALL USING (
        auth.uid() = instructor_id OR
        auth.uid() = client_id OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'reception'))
    );

-- RLS Policies for client_progress_assessments
CREATE POLICY "Instructors can manage assessments for their clients" ON client_progress_assessments
    FOR ALL USING (
        auth.uid() = instructor_id OR
        auth.uid() = client_id OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'reception'))
    );

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_instructor_client_assignments_updated_at BEFORE UPDATE ON instructor_client_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_client_progress_photos_updated_at BEFORE UPDATE ON client_progress_photos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_client_medical_updates_updated_at BEFORE UPDATE ON client_medical_updates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_client_progress_assessments_updated_at BEFORE UPDATE ON client_progress_assessments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();