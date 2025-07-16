const db = require('../config/database');

async function updateClassFields() {
  try {
    await db.connect();
    
    // 1. Add category field to classes table
    try {
      await db.run(`
        ALTER TABLE classes ADD COLUMN category TEXT CHECK(category IN ('personal', 'group')) DEFAULT 'group'
      `);
      console.log('✅ Category field added to classes table successfully!');
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        console.log('ℹ️ Category field already exists in classes table');
      } else {
        throw error;
      }
    }
    
    // 2. Update room field to support new room options
    // First, we need to recreate the table with new room options
    console.log('🔄 Updating room field with new options...');
    
    // Create backup of classes table
    await db.run(`
      CREATE TABLE classes_backup AS SELECT * FROM classes
    `);
    console.log('📋 Created backup of classes table');
    
    // Drop original table
    await db.run(`DROP TABLE classes`);
    console.log('🗑️ Dropped original classes table');
    
    // Recreate table with updated room options and without level constraint
    await db.run(`
      CREATE TABLE classes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        instructor_id INTEGER NOT NULL,
        date DATE NOT NULL,
        time TIME NOT NULL,
        duration INTEGER NOT NULL,
        level TEXT,
        capacity INTEGER NOT NULL,
        enrolled INTEGER DEFAULT 0,
        equipment TEXT,
        equipment_type TEXT CHECK(equipment_type IN ('mat', 'reformer', 'both')) NOT NULL,
        description TEXT,
        status TEXT CHECK(status IN ('active', 'cancelled', 'full')) DEFAULT 'active',
        room TEXT CHECK(room IN ('Reformer Room', 'Mat Room', 'Cadillac Room', 'Wall Room', '')),
        category TEXT CHECK(category IN ('personal', 'group')) DEFAULT 'group',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (instructor_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);
    console.log('✅ Created new classes table with updated schema');
    
    // Map old room values to new room values
    await db.run(`
      INSERT INTO classes (id, name, instructor_id, date, time, duration, level, capacity, enrolled, 
                          equipment, equipment_type, description, status, room, category, created_at, updated_at)
      SELECT id, name, instructor_id, date, time, duration, level, capacity, enrolled, 
             equipment, equipment_type, description, status, 
             CASE 
               WHEN room = 'Room A' THEN 'Reformer Room'
               WHEN room = 'Room B' THEN 'Mat Room'
               ELSE room
             END as room,
             'group' as category,
             created_at, updated_at
      FROM classes_backup
    `);
    console.log('📤 Migrated data from backup to new table');
    
    // Drop backup table
    await db.run(`DROP TABLE classes_backup`);
    console.log('🧹 Cleaned up backup table');
    
    // Recreate indexes
    await db.run('CREATE INDEX IF NOT EXISTS idx_classes_date ON classes(date)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_classes_instructor ON classes(instructor_id)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_classes_room ON classes(room)');
    await db.run('CREATE INDEX IF NOT EXISTS idx_classes_category ON classes(category)');
    console.log('📇 Recreated indexes');
    
    console.log('✅ Successfully updated class fields!');
    console.log('📝 Changes made:');
    console.log('   - Added category field (personal, group)');
    console.log('   - Updated room options: Reformer Room, Mat Room, Cadillac Room, Wall Room');
    console.log('   - Removed level constraint (made optional)');
    console.log('   - Migrated existing "Room A" -> "Reformer Room", "Room B" -> "Mat Room"');
    
  } catch (error) {
    console.error('❌ Error updating class fields:', error);
    throw error;
  } finally {
    await db.close();
  }
}

// Run the migration
if (require.main === module) {
  updateClassFields();
}

module.exports = updateClassFields; 