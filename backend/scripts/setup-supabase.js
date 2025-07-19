#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupSupabase() {
  console.log('🚀 Supabase Setup for Pilates Studio App');
  console.log('==========================================\n');

  try {
    // Get Supabase credentials
    const supabaseUrl = await question('Enter your Supabase URL (e.g., https://your-project.supabase.co): ');
    const supabaseAnonKey = await question('Enter your Supabase Anon Key: ');
    const supabaseServiceKey = await question('Enter your Supabase Service Role Key: ');

    // Test connection
    console.log('\n🔗 Testing connection to Supabase...');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase.from('users').select('count').limit(1);
    
    if (error) {
      console.log('❌ Connection failed. Please check your credentials.');
      console.log('Error:', error.message);
      return;
    }

    console.log('✅ Successfully connected to Supabase!');

    // Create .env file
    const envContent = `# Supabase Configuration
SUPABASE_URL=${supabaseUrl}
SUPABASE_ANON_KEY=${supabaseAnonKey}
SUPABASE_SERVICE_ROLE_KEY=${supabaseServiceKey}

# Server Configuration
PORT=3000
NODE_ENV=development

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:8081,http://localhost:19006,http://localhost:3000,https://animo-pilates-studio.vercel.app

# JWT Configuration
JWT_SECRET=${Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)}

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads

# Notification Configuration
PUSH_NOTIFICATIONS_ENABLED=true
`;

    const fs = require('fs');
    const path = require('path');
    const envPath = path.join(__dirname, '../.env');

    fs.writeFileSync(envPath, envContent);
    console.log('✅ Created .env file with Supabase configuration');

    // Check if schema exists
    console.log('\n📊 Checking database schema...');
    const { data: tables, error: schemaError } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    if (schemaError && schemaError.code === '42P01') {
      console.log('⚠️  Database schema not found. Please run the migration first.');
      console.log('Run: npm run migrate-supabase');
    } else {
      console.log('✅ Database schema is ready');
    }

    console.log('\n🎉 Setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Run: npm run migrate-supabase');
    console.log('2. Start your server: npm start');
    console.log('3. Test your API endpoints');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  } finally {
    rl.close();
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  setupSupabase();
}

module.exports = setupSupabase; 