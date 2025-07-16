const Database = require('../config/database');

async function createAdvancedClientTables() {
  try {
    await Database.connect();
    console.log('🚀 Creating advanced client management tables...');

    // 1. Client Notes Table - For admin notes about clients
    console.log('📝 Creating client_notes table...');
    await Database.run(`
      CREATE TABLE IF NOT EXISTS client_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        admin_id INTEGER NOT NULL,
        note_type TEXT CHECK(note_type IN ('general', 'medical', 'billing', 'behavior', 'retention', 'complaint', 'compliment')) DEFAULT 'general',
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        priority TEXT CHECK(priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
        is_private BOOLEAN DEFAULT 0,
        tags TEXT, -- JSON array of tags
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (admin_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // 2. Client Documents Table - For photo/document storage
    console.log('📁 Creating client_documents table...');
    await Database.run(`
      CREATE TABLE IF NOT EXISTS client_documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        uploaded_by INTEGER NOT NULL,
        document_type TEXT CHECK(document_type IN ('photo', 'contract', 'medical_form', 'id_copy', 'waiver', 'receipt', 'other')) NOT NULL,
        file_name TEXT NOT NULL,
        original_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        mime_type TEXT NOT NULL,
        description TEXT,
        is_sensitive BOOLEAN DEFAULT 0,
        expiry_date DATE, -- For contracts, waivers etc.
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (uploaded_by) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // 3. Client Activity Log Table - For comprehensive activity tracking
    console.log('📊 Creating client_activity_log table...');
    await Database.run(`
      CREATE TABLE IF NOT EXISTS client_activity_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        activity_type TEXT CHECK(activity_type IN (
          'registration', 'login', 'subscription_purchase', 'subscription_renewal', 'subscription_cancellation',
          'class_booking', 'class_cancellation', 'class_attendance', 'class_no_show',
          'payment_made', 'payment_failed', 'profile_update', 'note_added', 'document_uploaded',
          'status_change', 'communication_sent', 'waitlist_joined', 'waitlist_promoted'
        )) NOT NULL,
        description TEXT NOT NULL,
        metadata TEXT, -- JSON data for activity details
        performed_by INTEGER, -- NULL for automatic activities
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (performed_by) REFERENCES users (id) ON DELETE SET NULL
      )
    `);

    // 4. Client Lifecycle Stages Table - For lifecycle management
    console.log('🎯 Creating client_lifecycle table...');
    await Database.run(`
      CREATE TABLE IF NOT EXISTS client_lifecycle (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER UNIQUE NOT NULL,
        current_stage TEXT CHECK(current_stage IN (
          'prospect', 'trial', 'new_member', 'active', 'at_risk', 'inactive', 'churned', 'won_back'
        )) DEFAULT 'prospect',
        previous_stage TEXT,
        stage_changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        stage_changed_by INTEGER,
        days_in_current_stage INTEGER DEFAULT 0,
        lifetime_value DECIMAL(10,2) DEFAULT 0.00,
        risk_score INTEGER DEFAULT 0, -- 0-100, higher = more at risk
        last_engagement DATE,
        acquisition_source TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (stage_changed_by) REFERENCES users (id) ON DELETE SET NULL
      )
    `);

    // 5. Client Search History Table - For saved searches and quick filters
    console.log('🔍 Creating client_search_history table...');
    await Database.run(`
      CREATE TABLE IF NOT EXISTS client_search_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        admin_id INTEGER NOT NULL,
        search_name TEXT NOT NULL,
        search_filters TEXT NOT NULL, -- JSON of filter criteria
        is_saved BOOLEAN DEFAULT 0,
        use_count INTEGER DEFAULT 1,
        last_used DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (admin_id) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // 6. Client Communications Log Table - For tracking all communications
    console.log('📧 Creating client_communications table...');
    await Database.run(`
      CREATE TABLE IF NOT EXISTS client_communications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER NOT NULL,
        sent_by INTEGER NOT NULL,
        communication_type TEXT CHECK(communication_type IN ('email', 'sms', 'push', 'phone', 'in_person')) NOT NULL,
        subject TEXT,
        message TEXT NOT NULL,
        status TEXT CHECK(status IN ('sent', 'delivered', 'read', 'failed', 'bounced')) DEFAULT 'sent',
        campaign_id TEXT, -- For bulk communications
        response_received BOOLEAN DEFAULT 0,
        response_content TEXT,
        scheduled_for DATETIME,
        sent_at DATETIME,
        delivered_at DATETIME,
        read_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (sent_by) REFERENCES users (id) ON DELETE CASCADE
      )
    `);

    // Add reminder fields to client_notes if not present
    async function addReminderFields() {
      try {
        await Database.run(`ALTER TABLE client_notes ADD COLUMN reminder_at DATETIME`);
        console.log('✅ Added reminder_at to client_notes');
      } catch (e) {
        if (!e.message.includes('duplicate column name')) throw e;
        else console.log('ℹ️ reminder_at already exists');
      }
      try {
        await Database.run(`ALTER TABLE client_notes ADD COLUMN reminder_message TEXT`);
        console.log('✅ Added reminder_message to client_notes');
      } catch (e) {
        if (!e.message.includes('duplicate column name')) throw e;
        else console.log('ℹ️ reminder_message already exists');
      }
      try {
        await Database.run(`ALTER TABLE client_notes ADD COLUMN reminder_sent INTEGER DEFAULT 0`);
        console.log('✅ Added reminder_sent to client_notes');
      } catch (e) {
        if (!e.message.includes('duplicate column name')) throw e;
        else console.log('ℹ️ reminder_sent already exists');
      }
    }

    await addReminderFields();

    // Create indexes for better performance
    console.log('⚡ Creating indexes...');
    
    // Client Notes indexes
    await Database.run('CREATE INDEX IF NOT EXISTS idx_client_notes_client_id ON client_notes(client_id)');
    await Database.run('CREATE INDEX IF NOT EXISTS idx_client_notes_admin_id ON client_notes(admin_id)');
    await Database.run('CREATE INDEX IF NOT EXISTS idx_client_notes_type ON client_notes(note_type)');
    await Database.run('CREATE INDEX IF NOT EXISTS idx_client_notes_priority ON client_notes(priority)');
    await Database.run('CREATE INDEX IF NOT EXISTS idx_client_notes_created_at ON client_notes(created_at)');

    // Client Documents indexes
    await Database.run('CREATE INDEX IF NOT EXISTS idx_client_documents_client_id ON client_documents(client_id)');
    await Database.run('CREATE INDEX IF NOT EXISTS idx_client_documents_type ON client_documents(document_type)');
    await Database.run('CREATE INDEX IF NOT EXISTS idx_client_documents_uploaded_by ON client_documents(uploaded_by)');

    // Client Activity Log indexes
    await Database.run('CREATE INDEX IF NOT EXISTS idx_client_activity_client_id ON client_activity_log(client_id)');
    await Database.run('CREATE INDEX IF NOT EXISTS idx_client_activity_type ON client_activity_log(activity_type)');
    await Database.run('CREATE INDEX IF NOT EXISTS idx_client_activity_created_at ON client_activity_log(created_at)');
    await Database.run('CREATE INDEX IF NOT EXISTS idx_client_activity_performed_by ON client_activity_log(performed_by)');

    // Client Lifecycle indexes
    await Database.run('CREATE INDEX IF NOT EXISTS idx_client_lifecycle_stage ON client_lifecycle(current_stage)');
    await Database.run('CREATE INDEX IF NOT EXISTS idx_client_lifecycle_risk_score ON client_lifecycle(risk_score)');
    await Database.run('CREATE INDEX IF NOT EXISTS idx_client_lifecycle_last_engagement ON client_lifecycle(last_engagement)');

    // Client Search History indexes
    await Database.run('CREATE INDEX IF NOT EXISTS idx_client_search_admin_id ON client_search_history(admin_id)');
    await Database.run('CREATE INDEX IF NOT EXISTS idx_client_search_saved ON client_search_history(is_saved)');

    // Client Communications indexes
    await Database.run('CREATE INDEX IF NOT EXISTS idx_client_communications_client_id ON client_communications(client_id)');
    await Database.run('CREATE INDEX IF NOT EXISTS idx_client_communications_type ON client_communications(communication_type)');
    await Database.run('CREATE INDEX IF NOT EXISTS idx_client_communications_sent_by ON client_communications(sent_by)');
    await Database.run('CREATE INDEX IF NOT EXISTS idx_client_communications_status ON client_communications(status)');

    console.log('✅ Advanced client management tables created successfully!');
    console.log('');
    console.log('📋 Created tables:');
    console.log('   🗒️  client_notes - Admin notes and observations');
    console.log('   📁  client_documents - Photos and document storage');
    console.log('   📊  client_activity_log - Comprehensive activity tracking');
    console.log('   🎯  client_lifecycle - Lifecycle stage management');
    console.log('   🔍  client_search_history - Saved searches and filters');
    console.log('   📧  client_communications - Communication tracking');
    console.log('');
    console.log('🎯 Features enabled:');
    console.log('   ✅ Client notes with categories and priorities');
    console.log('   ✅ Document and photo management');
    console.log('   ✅ Complete activity timeline');
    console.log('   ✅ Lifecycle stage tracking');
    console.log('   ✅ Advanced search capabilities');
    console.log('   ✅ Communication history');

    await Database.close();
  } catch (error) {
    console.error('❌ Error creating advanced client tables:', error);
    if (Database) {
      await Database.close();
    }
    process.exit(1);
  }
}

// Run the creation if called directly
if (require.main === module) {
  createAdvancedClientTables();
}

module.exports = createAdvancedClientTables; 