const db = require('../config/database');

const addReferralSourceField = async () => {
  try {
    await db.connect();
    console.log('🔄 Adding referral_source field to users table...');
    
    // Check if column already exists
    const tableInfo = await db.all("PRAGMA table_info(users)");
    const columnExists = tableInfo.some(column => column.name === 'referral_source');
    
    if (columnExists) {
      console.log('✅ referral_source field already exists');
      return;
    }
    
    // Add the referral_source column
    await db.run(`
      ALTER TABLE users 
      ADD COLUMN referral_source TEXT CHECK(referral_source IN (
        'google_search', 
        'social_media', 
        'friend_referral', 
        'website', 
        'instagram', 
        'facebook', 
        'local_ad', 
        'word_of_mouth', 
        'flyer', 
        'event', 
        'other'
      ))
    `);
    
    console.log('✅ Successfully added referral_source field to users table');
    console.log('📊 Available referral sources:');
    console.log('   - google_search: Found via Google search');
    console.log('   - social_media: General social media');
    console.log('   - friend_referral: Referred by a friend');
    console.log('   - website: Studio website');
    console.log('   - instagram: Instagram');
    console.log('   - facebook: Facebook');
    console.log('   - local_ad: Local advertisement');
    console.log('   - word_of_mouth: Word of mouth');
    console.log('   - flyer: Physical flyer');
    console.log('   - event: Studio event or demonstration');
    console.log('   - other: Other source');
    
  } catch (error) {
    console.error('❌ Error adding referral_source field:', error);
    throw error;
  } finally {
    await db.close();
  }
};

// Run if called directly
if (require.main === module) {
  addReferralSourceField()
    .then(() => {
      console.log('🎉 Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { addReferralSourceField }; 