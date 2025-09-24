-- RLS Policies for Themes Table
-- These policies allow all authenticated users to read themes
-- but only staff (admin/reception) can modify them

-- Enable RLS on themes table (if not already enabled)
ALTER TABLE public.themes ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow all authenticated users to read themes
-- Themes are styling data that should be publicly readable
CREATE POLICY "Allow authenticated users to read themes" ON public.themes
    FOR SELECT 
    USING (auth.role() = 'authenticated');

-- Policy 2: Allow admin and reception to insert themes
CREATE POLICY "Allow admin and reception to insert themes" ON public.themes
    FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'reception')
        )
    );

-- Policy 3: Allow admin and reception to update themes
CREATE POLICY "Allow admin and reception to update themes" ON public.themes
    FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'reception')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'reception')
        )
    );

-- Policy 4: Allow admin and reception to delete themes
CREATE POLICY "Allow admin and reception to delete themes" ON public.themes
    FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('admin', 'reception')
        )
    );
