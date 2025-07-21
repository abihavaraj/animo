const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../database/pilates_studio.db');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

class Database {
  constructor() {
    this.db = null;
    this.isConnected = false;
    // Re-enable Supabase for PostgreSQL database
    this.useSupabase = !!(supabaseUrl && supabaseServiceKey);
    
    if (this.useSupabase) {
      this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        // Use service role to bypass RLS
        db: {
          schema: 'public'
        },
        // Force bypass RLS with service role
        global: {
          headers: {
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'apikey': supabaseServiceKey,
            'Prefer': 'return=representation'
          }
        }
      });
      console.log('🔗 Using Supabase database with service role (RLS bypass)');
    } else {
      console.log('💾 Using SQLite database');
    }
    
    this.connect();
  }

  connect() {
    return new Promise((resolve, reject) => {
      if (this.isConnected) {
        resolve(this.db);
        return;
      }

      if (this.useSupabase) {
        // Supabase connection is handled by the client
        this.isConnected = true;
        resolve(this.supabase);
      } else {
        // SQLite connection
        this.db = new sqlite3.Database(DB_PATH, (err) => {
          if (err) {
            console.error('Error opening database:', err.message);
            reject(err);
          } else {
            console.log('Connected to SQLite database');
            this.isConnected = true;
            
            // Enable WAL mode for better performance
            this.db.run('PRAGMA journal_mode = WAL');
            this.db.run('PRAGMA synchronous = NORMAL');
            this.db.run('PRAGMA cache_size = 10000');
            this.db.run('PRAGMA temp_store = MEMORY');
            
            resolve(this.db);
          }
        });
      }
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      if (this.useSupabase) {
        // Supabase handles connection management
        resolve();
      } else if (this.db) {
        this.db.close((err) => {
          if (err) {
            reject(err);
          } else {
            console.log('Database connection closed');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  async run(sql, params = []) {
    if (this.useSupabase) {
      // For Supabase, we should use direct table operations instead of raw SQL
      // Most operations should go through the Supabase client methods
      console.warn('⚠️ Raw SQL not supported in Supabase. Use direct table operations instead.');
      return { id: null, changes: 0 };
    } else {
      // SQLite implementation
      return new Promise((resolve, reject) => {
        this.db.run(sql, params, function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ id: this.lastID, changes: this.changes });
          }
        });
      });
    }
  }

  async get(sql, params = []) {
    if (this.useSupabase) {
      // For Supabase, we should use direct table operations instead of raw SQL
      console.warn('⚠️ Raw SQL not supported in Supabase. Use direct table operations instead.');
      return null;
    } else {
      // SQLite implementation
      return new Promise((resolve, reject) => {
        this.db.get(sql, params, (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        });
      });
    }
  }

  async all(sql, params = []) {
    if (this.useSupabase) {
      // For Supabase, we should use direct table operations instead of raw SQL
      console.warn('⚠️ Raw SQL not supported in Supabase. Use direct table operations instead.');
      return [];
    } else {
      // SQLite implementation
      return new Promise((resolve, reject) => {
        this.db.all(sql, params, (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        });
      });
    }
  }
}

module.exports = new Database(); 