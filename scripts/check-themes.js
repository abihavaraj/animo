/**
 * Check what themes are currently in the database
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://byhqueksdwlbiwodpbbd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5aHF1ZWtzZHdsYml3b2RwYmJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4NjA0NzgsImV4cCI6MjA2ODQzNjQ3OH0.UpbbA73l8to48B42AWiGaL8sXkOmJIqeisbaDg-u-Io';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkThemes() {
  try {
    console.log('🔍 Checking current themes in database...');
    
    const { data: themes, error } = await supabase
      .from('themes')
      .select('id, name, display_name, is_active, created_at')
      .order('name');
    
    if (error) {
      console.error('❌ Error:', error);
      return;
    }
    
    console.log(`\n📋 Found ${themes.length} themes:`);
    console.log('─'.repeat(80));
    themes.forEach((theme, index) => {
      const status = theme.is_active ? '✅ ACTIVE' : '⭕ INACTIVE';
      console.log(`${index + 1}. ${theme.name}`);
      console.log(`   Display: ${theme.display_name}`);
      console.log(`   Status: ${status}`);
      console.log(`   ID: ${theme.id}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkThemes();
