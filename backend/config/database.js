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
    this.useSupabase = !!(supabaseUrl && supabaseServiceKey);
    
    if (this.useSupabase) {
      this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
      console.log('🔗 Using Supabase database');
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
      // Convert SQLite-style queries to Supabase
      try {
        // For INSERT operations
        if (sql.trim().toUpperCase().startsWith('INSERT')) {
          const tableMatch = sql.match(/INSERT INTO (\w+)/i);
          if (tableMatch) {
            const tableName = tableMatch[1];
            const valuesMatch = sql.match(/VALUES\s*\(([^)]+)\)/i);
            if (valuesMatch) {
              const values = valuesMatch[1].split(',').map(v => v.trim().replace(/['"]/g, ''));
              const data = {};
              // This is a simplified approach - you might need to adjust based on your specific queries
              const { data: result, error } = await this.supabase
                .from(tableName)
                .insert(data)
                .select();
              
              if (error) throw error;
              return { id: result?.[0]?.id, changes: result?.length || 0 };
            }
          }
        }
        
        // For UPDATE operations
        if (sql.trim().toUpperCase().startsWith('UPDATE')) {
          const tableMatch = sql.match(/UPDATE (\w+)/i);
          if (tableMatch) {
            const tableName = tableMatch[1];
            const whereMatch = sql.match(/WHERE (.+)/i);
            const setMatch = sql.match(/SET (.+?) WHERE/i);
            
            if (setMatch && whereMatch) {
              const setClause = setMatch[1];
              const whereClause = whereMatch[1];
              
              // Parse SET clause
              const updates = {};
              setClause.split(',').forEach(item => {
                const [key, value] = item.split('=').map(s => s.trim());
                updates[key] = value.replace(/['"]/g, '');
              });
              
              // Parse WHERE clause (simplified)
              const whereConditions = whereClause.split('AND').map(cond => cond.trim());
              
              let query = this.supabase.from(tableName).update(updates);
              
              // Apply WHERE conditions
              whereConditions.forEach(condition => {
                const [key, operator, value] = condition.split(/\s+/);
                if (operator === '=') {
                  query = query.eq(key, value.replace(/['"]/g, ''));
                }
              });
              
              const { data, error } = await query.select();
              if (error) throw error;
              return { changes: data?.length || 0 };
            }
          }
        }
        
        // For DELETE operations
        if (sql.trim().toUpperCase().startsWith('DELETE')) {
          const tableMatch = sql.match(/DELETE FROM (\w+)/i);
          if (tableMatch) {
            const tableName = tableMatch[1];
            const whereMatch = sql.match(/WHERE (.+)/i);
            
            if (whereMatch) {
              const whereClause = whereMatch[1];
              const [key, operator, value] = whereClause.split(/\s+/);
              
              let query = this.supabase.from(tableName).delete();
              if (operator === '=') {
                query = query.eq(key, value.replace(/['"]/g, ''));
              }
              
              const { data, error } = await query.select();
              if (error) throw error;
              return { changes: data?.length || 0 };
            }
          }
        }
        
        // For other operations, use raw SQL
        const { data, error } = await this.supabase.rpc('execute_sql', {
          sql_query: sql,
          sql_params: params
        });
        
        if (error) throw error;
        return { id: data?.id, changes: data?.rowCount || 0 };
        
      } catch (error) {
        console.error('Supabase query error:', error);
        throw error;
      }
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
      try {
        // Convert SQLite queries to Supabase
        if (sql.trim().toUpperCase().startsWith('SELECT')) {
          const tableMatch = sql.match(/FROM (\w+)/i);
          if (tableMatch) {
            const tableName = tableMatch[1];
            let query = this.supabase.from(tableName).select('*');
            
            // Parse WHERE conditions (simplified)
            const whereMatch = sql.match(/WHERE (.+?)(?:ORDER BY|LIMIT|$)/i);
            if (whereMatch) {
              const whereClause = whereMatch[1];
              const conditions = whereClause.split('AND').map(cond => cond.trim());
              
              conditions.forEach(condition => {
                if (condition.includes('=')) {
                  const [key, value] = condition.split('=').map(s => s.trim());
                  query = query.eq(key, value.replace(/['"]/g, ''));
                }
              });
            }
            
            const { data, error } = await query.limit(1);
            if (error) throw error;
            return data?.[0] || null;
          }
        }
        
        // Fallback to raw SQL
        const { data, error } = await this.supabase.rpc('execute_sql', {
          sql_query: sql,
          sql_params: params
        });
        
        if (error) throw error;
        return data?.[0] || null;
        
      } catch (error) {
        console.error('Supabase query error:', error);
        throw error;
      }
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
      try {
        // Convert SQLite queries to Supabase
        if (sql.trim().toUpperCase().startsWith('SELECT')) {
          const tableMatch = sql.match(/FROM (\w+)/i);
          if (tableMatch) {
            const tableName = tableMatch[1];
            let query = this.supabase.from(tableName).select('*');
            
            // Parse WHERE conditions (simplified)
            const whereMatch = sql.match(/WHERE (.+?)(?:ORDER BY|LIMIT|$)/i);
            if (whereMatch) {
              const whereClause = whereMatch[1];
              const conditions = whereClause.split('AND').map(cond => cond.trim());
              
              conditions.forEach(condition => {
                if (condition.includes('=')) {
                  const [key, value] = condition.split('=').map(s => s.trim());
                  query = query.eq(key, value.replace(/['"]/g, ''));
                }
              });
            }
            
            const { data, error } = await query;
            if (error) throw error;
            return data || [];
          }
        }
        
        // Fallback to raw SQL
        const { data, error } = await this.supabase.rpc('execute_sql', {
          sql_query: sql,
          sql_params: params
        });
        
        if (error) throw error;
        return data || [];
        
      } catch (error) {
        console.error('Supabase query error:', error);
        throw error;
      }
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