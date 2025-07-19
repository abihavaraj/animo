require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Check if Supabase environment variables are set
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// SQLite database path
const sqliteDbPath = path.join(__dirname, '../database/pilates_studio.db');

// Check if SQLite database exists
if (!fs.existsSync(sqliteDbPath)) {
  console.error('❌ SQLite database not found at:', sqliteDbPath);
  process.exit(1);
}

const sqliteDb = new sqlite3.Database(sqliteDbPath);

// Helper function to get data from SQLite
function getSqliteData(query) {
  return new Promise((resolve, reject) => {
    sqliteDb.all(query, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Helper function to format data for Supabase
function formatDataForSupabase(data, tableName) {
  return data.map(row => {
    const formattedRow = { ...row };
    
    // Handle JSON fields
    if (formattedRow.features && typeof formattedRow.features === 'string') {
      try {
        formattedRow.features = JSON.parse(formattedRow.features);
      } catch (e) {
        formattedRow.features = [];
      }
    }
    
    if (formattedRow.equipment && typeof formattedRow.equipment === 'string') {
      try {
        formattedRow.equipment = JSON.parse(formattedRow.equipment);
      } catch (e) {
        formattedRow.equipment = [];
      }
    }
    
    if (formattedRow.metadata && typeof formattedRow.metadata === 'string') {
      try {
        formattedRow.metadata = JSON.parse(formattedRow.metadata);
      } catch (e) {
        formattedRow.metadata = {};
      }
    }
    
    // Convert boolean fields
    if (formattedRow.is_active !== undefined) {
      formattedRow.is_active = Boolean(formattedRow.is_active);
    }
    
    if (formattedRow.checked_in !== undefined) {
      formattedRow.checked_in = Boolean(formattedRow.checked_in);
    }
    
    if (formattedRow.is_private !== undefined) {
      formattedRow.is_private = Boolean(formattedRow.is_private);
    }
    
    if (formattedRow.is_read !== undefined) {
      formattedRow.is_read = Boolean(formattedRow.is_read);
    }
    
    // Convert numeric fields
    if (formattedRow.credit_balance !== undefined) {
      formattedRow.credit_balance = parseFloat(formattedRow.credit_balance) || 0;
    }
    
    if (formattedRow.monthly_price !== undefined) {
      formattedRow.monthly_price = parseFloat(formattedRow.monthly_price) || 0;
    }
    
    if (formattedRow.amount !== undefined) {
      formattedRow.amount = parseFloat(formattedRow.amount) || 0;
    }
    
    if (formattedRow.risk_score !== undefined) {
      formattedRow.risk_score = parseInt(formattedRow.risk_score) || 0;
    }
    
    if (formattedRow.lifetime_value !== undefined) {
      formattedRow.lifetime_value = parseFloat(formattedRow.lifetime_value) || 0;
    }
    
    return formattedRow;
  });
}

async function migrateData() {
  try {
    console.log('🚀 Starting migration to Supabase...');
    console.log('📊 Supabase URL:', supabaseUrl);
    
    // Test Supabase connection
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('❌ Failed to connect to Supabase:', testError);
      process.exit(1);
    }
    
    console.log('✅ Connected to Supabase successfully');

    // 1. Migrate users
    console.log('\n👥 Migrating users...');
    const users = await getSqliteData('SELECT * FROM users');
    const formattedUsers = formatDataForSupabase(users, 'users');
    
    for (const user of formattedUsers) {
      const { error } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          emergency_contact: user.emergency_contact,
          medical_conditions: user.medical_conditions,
          join_date: user.join_date,
          status: user.status,
          credit_balance: user.credit_balance,
          remaining_classes: user.remaining_classes,
          created_at: user.created_at,
          updated_at: user.updated_at
        });
      
      if (error) {
        console.error('❌ Error migrating user:', user.id, error);
      }
    }
    console.log(`✅ Migrated ${users.length} users`);

    // 2. Migrate subscription plans
    console.log('\n📋 Migrating subscription plans...');
    const plans = await getSqliteData('SELECT * FROM subscription_plans');
    const formattedPlans = formatDataForSupabase(plans, 'subscription_plans');
    
    for (const plan of formattedPlans) {
      const { error } = await supabase
        .from('subscription_plans')
        .upsert({
          id: plan.id,
          name: plan.name,
          monthly_classes: plan.monthly_classes,
          monthly_price: plan.monthly_price,
          equipment_access: plan.equipment_access,
          description: plan.description,
          category: plan.category,
          features: plan.features,
          is_active: plan.is_active,
          created_at: plan.created_at,
          updated_at: plan.updated_at
        });
      
      if (error) {
        console.error('❌ Error migrating plan:', plan.id, error);
      }
    }
    console.log(`✅ Migrated ${plans.length} subscription plans`);

    // 3. Migrate user subscriptions
    console.log('\n💳 Migrating user subscriptions...');
    const subscriptions = await getSqliteData('SELECT * FROM user_subscriptions');
    const formattedSubscriptions = formatDataForSupabase(subscriptions, 'user_subscriptions');
    
    for (const subscription of formattedSubscriptions) {
      const { error } = await supabase
        .from('user_subscriptions')
        .upsert({
          id: subscription.id,
          user_id: subscription.user_id,
          plan_id: subscription.plan_id,
          remaining_classes: subscription.remaining_classes,
          start_date: subscription.start_date,
          end_date: subscription.end_date,
          status: subscription.status,
          created_at: subscription.created_at,
          updated_at: subscription.updated_at
        });
      
      if (error) {
        console.error('❌ Error migrating subscription:', subscription.id, error);
      }
    }
    console.log(`✅ Migrated ${subscriptions.length} user subscriptions`);

    // 4. Migrate classes
    console.log('\n🏋️ Migrating classes...');
    const classes = await getSqliteData('SELECT * FROM classes');
    const formattedClasses = formatDataForSupabase(classes, 'classes');
    
    for (const class_ of formattedClasses) {
      const { error } = await supabase
        .from('classes')
        .upsert({
          id: class_.id,
          name: class_.name,
          instructor_id: class_.instructor_id,
          date: class_.date,
          time: class_.time,
          duration: class_.duration,
          level: class_.level,
          capacity: class_.capacity,
          enrolled: class_.enrolled,
          equipment: class_.equipment,
          equipment_type: class_.equipment_type,
          description: class_.description,
          status: class_.status,
          created_at: class_.created_at,
          updated_at: class_.updated_at
        });
      
      if (error) {
        console.error('❌ Error migrating class:', class_.id, error);
      }
    }
    console.log(`✅ Migrated ${classes.length} classes`);

    // 5. Migrate bookings
    console.log('\n📅 Migrating bookings...');
    const bookings = await getSqliteData('SELECT * FROM bookings');
    const formattedBookings = formatDataForSupabase(bookings, 'bookings');
    
    for (const booking of formattedBookings) {
      const { error } = await supabase
        .from('bookings')
        .upsert({
          id: booking.id,
          user_id: booking.user_id,
          class_id: booking.class_id,
          subscription_id: booking.subscription_id,
          booking_date: booking.booking_date,
          status: booking.status,
          checked_in: booking.checked_in,
          check_in_time: booking.check_in_time,
          created_at: booking.created_at,
          updated_at: booking.updated_at
        });
      
      if (error) {
        console.error('❌ Error migrating booking:', booking.id, error);
      }
    }
    console.log(`✅ Migrated ${bookings.length} bookings`);

    // 6. Migrate waitlist
    console.log('\n⏳ Migrating waitlist...');
    const waitlist = await getSqliteData('SELECT * FROM waitlist');
    
    for (const item of waitlist) {
      const { error } = await supabase
        .from('waitlist')
        .upsert({
          id: item.id,
          user_id: item.user_id,
          class_id: item.class_id,
          position: item.position,
          created_at: item.created_at
        });
      
      if (error) {
        console.error('❌ Error migrating waitlist item:', item.id, error);
      }
    }
    console.log(`✅ Migrated ${waitlist.length} waitlist items`);

    // 7. Migrate payments
    console.log('\n💰 Migrating payments...');
    const payments = await getSqliteData('SELECT * FROM payments');
    const formattedPayments = formatDataForSupabase(payments, 'payments');
    
    for (const payment of formattedPayments) {
      const { error } = await supabase
        .from('payments')
        .upsert({
          id: payment.id,
          user_id: payment.user_id,
          subscription_id: payment.subscription_id,
          amount: payment.amount,
          payment_date: payment.payment_date,
          payment_method: payment.payment_method,
          status: payment.status,
          transaction_id: payment.transaction_id,
          created_at: payment.created_at
        });
      
      if (error) {
        console.error('❌ Error migrating payment:', payment.id, error);
      }
    }
    console.log(`✅ Migrated ${payments.length} payments`);

    // 8. Migrate manual credits
    console.log('\n💳 Migrating manual credits...');
    const manualCredits = await getSqliteData('SELECT * FROM manual_credits');
    const formattedCredits = formatDataForSupabase(manualCredits, 'manual_credits');
    
    for (const credit of formattedCredits) {
      const { error } = await supabase
        .from('manual_credits')
        .upsert({
          id: credit.id,
          user_id: credit.user_id,
          admin_id: credit.admin_id,
          amount: credit.amount,
          classes_added: credit.classes_added,
          reason: credit.reason,
          description: credit.description,
          created_at: credit.created_at
        });
      
      if (error) {
        console.error('❌ Error migrating manual credit:', credit.id, error);
      }
    }
    console.log(`✅ Migrated ${manualCredits.length} manual credits`);

    // 9. Migrate client activity log
    console.log('\n📝 Migrating client activity log...');
    const activities = await getSqliteData('SELECT * FROM client_activity_log');
    const formattedActivities = formatDataForSupabase(activities, 'client_activity_log');
    
    for (const activity of formattedActivities) {
      const { error } = await supabase
        .from('client_activity_log')
        .upsert({
          id: activity.id,
          client_id: activity.client_id,
          activity_type: activity.activity_type,
          description: activity.description,
          performed_by: activity.performed_by,
          metadata: activity.metadata,
          created_at: activity.created_at
        });
      
      if (error) {
        console.error('❌ Error migrating activity:', activity.id, error);
      }
    }
    console.log(`✅ Migrated ${activities.length} activity log entries`);

    // 10. Migrate client notes
    console.log('\n📝 Migrating client notes...');
    const notes = await getSqliteData('SELECT * FROM client_notes');
    const formattedNotes = formatDataForSupabase(notes, 'client_notes');
    
    for (const note of formattedNotes) {
      const { error } = await supabase
        .from('client_notes')
        .upsert({
          id: note.id,
          client_id: note.client_id,
          note_text: note.note_text,
          note_type: note.note_type,
          created_by: note.created_by,
          is_private: note.is_private,
          created_at: note.created_at,
          updated_at: note.updated_at
        });
      
      if (error) {
        console.error('❌ Error migrating note:', note.id, error);
      }
    }
    console.log(`✅ Migrated ${notes.length} client notes`);

    // 11. Migrate client documents
    console.log('\n📄 Migrating client documents...');
    const documents = await getSqliteData('SELECT * FROM client_documents');
    const formattedDocuments = formatDataForSupabase(documents, 'client_documents');
    
    for (const document of formattedDocuments) {
      const { error } = await supabase
        .from('client_documents')
        .upsert({
          id: document.id,
          client_id: document.client_id,
          file_name: document.file_name,
          file_path: document.file_path,
          file_type: document.file_type,
          file_size: document.file_size,
          uploaded_by: document.uploaded_by,
          created_at: document.created_at
        });
      
      if (error) {
        console.error('❌ Error migrating document:', document.id, error);
      }
    }
    console.log(`✅ Migrated ${documents.length} client documents`);

    // 12. Migrate client lifecycle
    console.log('\n🔄 Migrating client lifecycle...');
    const lifecycle = await getSqliteData('SELECT * FROM client_lifecycle');
    const formattedLifecycle = formatDataForSupabase(lifecycle, 'client_lifecycle');
    
    for (const item of formattedLifecycle) {
      const { error } = await supabase
        .from('client_lifecycle')
        .upsert({
          id: item.id,
          client_id: item.client_id,
          current_stage: item.current_stage,
          previous_stage: item.previous_stage,
          stage_changed_at: item.stage_changed_at,
          stage_changed_by: item.stage_changed_by,
          risk_score: item.risk_score,
          lifetime_value: item.lifetime_value,
          created_at: item.created_at,
          updated_at: item.updated_at
        });
      
      if (error) {
        console.error('❌ Error migrating lifecycle item:', item.id, error);
      }
    }
    console.log(`✅ Migrated ${lifecycle.length} client lifecycle items`);

    // 13. Migrate notifications
    console.log('\n🔔 Migrating notifications...');
    const notifications = await getSqliteData('SELECT * FROM notifications');
    const formattedNotifications = formatDataForSupabase(notifications, 'notifications');
    
    for (const notification of formattedNotifications) {
      const { error } = await supabase
        .from('notifications')
        .upsert({
          id: notification.id,
          user_id: notification.user_id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          is_read: notification.is_read,
          push_token: notification.push_token,
          scheduled_for: notification.scheduled_for,
          sent_at: notification.sent_at,
          created_at: notification.created_at
        });
      
      if (error) {
        console.error('❌ Error migrating notification:', notification.id, error);
      }
    }
    console.log(`✅ Migrated ${notifications.length} notifications`);

    console.log('\n🎉 Migration completed successfully!');
    console.log('📊 All data has been migrated to Supabase');
    console.log('🔗 You can now use Supabase as your primary database');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    sqliteDb.close();
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrateData();
}

module.exports = migrateData; 