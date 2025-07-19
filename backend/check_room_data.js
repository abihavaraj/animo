const db = require('./config/database');

async function checkAndAddRoomData() {
  try {
    await db.connect();
    
    // Check current room data
    console.log('🔍 Checking current room data...');
    const classes = await db.all('SELECT id, name, room, equipment_type FROM classes LIMIT 10');
    console.log('Sample classes:', classes);
    
    // Count classes without room data
    const classesWithoutRoom = await db.get('SELECT COUNT(*) as count FROM classes WHERE room IS NULL OR room = ""');
    console.log(`\n📊 Classes without room data: ${classesWithoutRoom.count}`);
    
    if (classesWithoutRoom.count > 0) {
      console.log('\n🔧 Adding room data to classes...');
      
      // Define room assignments based on equipment type
      const roomAssignments = {
        'mat': 'Mat Room',
        'reformer': 'Reformer Room',
        'both': 'Reformer Room' // Classes with both equipment types go to Reformer Room
      };
      
      // Update classes with room assignments
      const equipmentTypes = await db.all('SELECT DISTINCT equipment_type FROM classes WHERE room IS NULL OR room = ""');
      
      for (const { equipment_type } of equipmentTypes) {
        const roomToAssign = roomAssignments[equipment_type] || 'Mat Room';
        
        const result = await db.run(
          'UPDATE classes SET room = ? WHERE (room IS NULL OR room = "") AND equipment_type = ?',
          [roomToAssign, equipment_type]
        );
        
        console.log(`   ✅ Assigned ${result.changes} ${equipment_type} classes to ${roomToAssign}`);
      }
      
      console.log('\n✅ Room data assignment completed!');
    }
    
    // Verify the updates
    console.log('\n🔍 Verifying updates...');
    const updatedClasses = await db.all('SELECT id, name, room, equipment_type FROM classes LIMIT 10');
    console.log('Updated sample classes:', updatedClasses);
    
    // Show distribution by room
    const roomDistribution = await db.all(`
      SELECT room, COUNT(*) as count 
      FROM classes 
      WHERE room IS NOT NULL AND room != ""
      GROUP BY room
    `);
    console.log('\n📊 Room distribution:', roomDistribution);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await db.close();
  }
}

checkAndAddRoomData(); 