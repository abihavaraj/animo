const db = require('./config/database');

async function checkAdmin() {
  try {
    await db.connect();
    const admin = await db.get('SELECT * FROM users WHERE role = "admin"');
    console.log('Admin user found:', {
      id: admin.id,
      name: admin.name,
      email: admin.email
    });
    await db.close();
  } catch (error) {
    console.error('Error:', error);
    if (db) await db.close();
  }
}

checkAdmin(); 