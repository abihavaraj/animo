const db = require('./config/database');

async function testDB() {
  try {
    const result = await db.get('SELECT 1 as test');
    console.log('DB OK:', result);
    process.exit(0);
  } catch (error) {
    console.error('DB Error:', error);
    process.exit(1);
  }
}

testDB(); 