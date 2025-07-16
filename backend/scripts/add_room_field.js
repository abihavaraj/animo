const Database = require('../config/database');

async function addRoomField() {
  try {
    await Database.connect();

    // Add room field to classes table
    await Database.run(`
      ALTER TABLE classes ADD COLUMN room TEXT CHECK(room IN ('Reformer Room', 'Mat Room', 'Cadillac Room', 'Wall Room', ''))
    `);

    console.log('✅ Room field added to classes table successfully!');

  } catch (error) {
    if (error.message.includes('duplicate column name')) {
      console.log('ℹ️ Room field already exists in classes table');
    } else {
      console.error('❌ Error adding room field:', error);
    }
  } finally {
    await Database.close();
  }
}

// Run the function
addRoomField();

module.exports = addRoomField; 