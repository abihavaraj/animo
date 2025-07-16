const db = require('../config/database');

async function addReceptionRole() {
  console.log('🔧 Adding reception role to database...');
  
  try {
    // Connect to database
    await db.connect();
    console.log('📱 Connected to database');
    
    // Check current schema
    const tableInfo = await db.all("PRAGMA table_info(users)");
    console.log('Current users table schema:', tableInfo);
    
    // Get current role constraint
    const createTableSQL = await db.get(`
      SELECT sql FROM sqlite_master 
      WHERE type='table' AND name='users'
    `);
    
    console.log('Current CREATE TABLE SQL:', createTableSQL.sql);
    
    // Check if reception role is already in the constraint
    if (createTableSQL.sql.includes("'reception'")) {
      console.log('✅ Reception role already exists in database schema');
      return;
    }
    
    console.log('🚀 Adding reception role to users table...');
    
    // Create a backup of the users table
    await db.run(`CREATE TABLE users_backup AS SELECT * FROM users`);
    console.log('📋 Created backup of users table');
    
    // Drop the original table
    await db.run(`DROP TABLE users`);
    console.log('🗑️ Dropped original users table');
    
    // Recreate users table with new role constraint
    await db.run(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        phone TEXT,
        role TEXT CHECK(role IN ('client', 'instructor', 'admin', 'reception')) NOT NULL DEFAULT 'client',
        emergency_contact TEXT,
        medical_conditions TEXT,
        join_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT CHECK(status IN ('active', 'inactive', 'suspended')) DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        credit_balance DECIMAL(10,2) DEFAULT 0.00,
        push_token TEXT
      )
    `);
    console.log('🆕 Created new users table with reception role');
    
    // Copy data back from backup
    await db.run(`
      INSERT INTO users (id, name, email, password, phone, role, emergency_contact, medical_conditions, 
                        join_date, status, created_at, updated_at, credit_balance, push_token)
      SELECT id, name, email, password, phone, role, emergency_contact, medical_conditions, 
             join_date, status, created_at, updated_at, credit_balance, push_token
      FROM users_backup
    `);
    console.log('📤 Restored user data from backup');
    
    // Drop the backup table
    await db.run(`DROP TABLE users_backup`);
    console.log('🧹 Cleaned up backup table');
    
    console.log('✅ Successfully added reception role to database!');
    
    // Verify the update
    const newTableInfo = await db.all("PRAGMA table_info(users)");
    const newCreateTableSQL = await db.get(`
      SELECT sql FROM sqlite_master 
      WHERE type='table' AND name='users'
    `);
    
    console.log('✅ Updated schema:', newCreateTableSQL.sql);
    
  } catch (error) {
    console.error('❌ Error adding reception role:', error);
    
    // Try to restore from backup if it exists
    try {
      const tables = await db.all(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='users_backup'
      `);
      
      if (tables.length > 0) {
        console.log('🔄 Attempting to restore from backup...');
        await db.run(`DROP TABLE IF EXISTS users`);
        await db.run(`ALTER TABLE users_backup RENAME TO users`);
        console.log('✅ Restored from backup');
      }
    } catch (restoreError) {
      console.error('❌ Failed to restore from backup:', restoreError);
    }
    
    throw error;
  } finally {
    // Always close the database connection
    try {
      await db.close();
      console.log('📱 Database connection closed');
    } catch (closeError) {
      console.error('Error closing database:', closeError);
    }
  }
}

// Run the migration
if (require.main === module) {
  addReceptionRole()
    .then(() => {
      console.log('🎉 Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { addReceptionRole }; 