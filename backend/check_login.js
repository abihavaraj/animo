const bcrypt = require('bcryptjs');
const db = require('./config/database');

async function checkLogin() {
  try {
    await db.connect();
    
    const admin = await db.get('SELECT * FROM users WHERE email = "admin@pilatesstudio.com"');
    if (!admin) {
      console.log('❌ No admin user found with that email');
      return;
    }
    
    console.log('👤 Admin user found:', {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role
    });
    
    // Test password
    const testPassword = 'admin123';
    const isMatch = await bcrypt.compare(testPassword, admin.password);
    console.log('🔐 Password test result:', isMatch ? '✅ CORRECT' : '❌ INCORRECT');
    
    if (!isMatch) {
      console.log('🔧 Let me create a new password hash for admin123...');
      const newHash = await bcrypt.hash(testPassword, 10);
      console.log('New hash:', newHash);
      
      // Update the password
      await db.run('UPDATE users SET password = ? WHERE id = ?', [newHash, admin.id]);
      console.log('✅ Password updated successfully');
    }
    
    await db.close();
  } catch (error) {
    console.error('Error:', error);
    if (db) await db.close();
  }
}

checkLogin(); 