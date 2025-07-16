const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'pilates_studio.db');
console.log('Database path:', dbPath);
console.log('Database exists:', require('fs').existsSync(dbPath));

const db = new Database(dbPath);

console.log('Checking database tables...');

// Check what tables exist
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables found:', tables.map(t => t.name));

if (tables.length > 0) {
  console.log('Looking for users...');
  const users = db.prepare('SELECT * FROM users WHERE email LIKE ?').all('%jennifer%');
  console.log('Users found:', users.length);

  if (users.length > 0) {
    const user = users[0];
    console.log(`Found user: ${user.name} (${user.email}) with ID ${user.id}`);
    
    console.log('Checking subscriptions...');
    const subscriptions = db.prepare(`
      SELECT us.*, sp.name as plan_name
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.user_id = ?
      ORDER BY us.created_at DESC
    `).all(user.id);
    
    console.log(`Subscriptions found: ${subscriptions.length}`);
    subscriptions.forEach(sub => {
      console.log(`  - ${sub.plan_name}: ${sub.remaining_classes} classes remaining, status: ${sub.status}`);
    });
  }
} else {
  console.log('No tables found in database');
}

db.close(); 