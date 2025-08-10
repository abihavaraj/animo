import { supabase } from '../config/supabase.config';

export interface SplinterLint {
  name: string;
  title: string;
  level: 'ERROR' | 'WARN' | 'INFO';
  facing: 'INTERNAL' | 'EXTERNAL';
  categories: string[];
  description: string;
  detail: string;
  remediation?: string;
  metadata?: any;
  cache_key: string;
}

export interface SplinterReport {
  lints: SplinterLint[];
  summary: {
    total: number;
    errors: number;
    warnings: number;
    info: number;
    security: number;
    performance: number;
  };
}

// Splinter SQL query from https://github.com/supabase/splinter
const SPLINTER_SQL = `
-- Supabase Splinter Linter
-- This query contains all the lints from the Splinter project
-- Source: https://github.com/supabase/splinter

WITH RECURSIVE
-- Lint definitions
lints AS (
  SELECT 
    'unindexed_foreign_keys' as name,
    'Unindexed Foreign Keys' as title,
    'WARN' as level,
    'EXTERNAL' as facing,
    ARRAY['PERFORMANCE'] as categories,
    'Foreign key columns should be indexed for better join performance' as description,
    'Foreign key columns without indexes can cause slow joins' as detail,
    'https://supabase.com/docs/guides/database/performance#indexes' as remediation
  UNION ALL
  SELECT 
    'missing_primary_keys' as name,
    'Missing Primary Keys' as title,
    'ERROR' as level,
    'EXTERNAL' as facing,
    ARRAY['SECURITY'] as categories,
    'Tables should have primary keys for data integrity' as description,
    'Tables without primary keys can cause data integrity issues' as detail,
    'https://supabase.com/docs/guides/database/design#primary-keys' as remediation
  UNION ALL
  SELECT 
    'unused_indexes' as name,
    'Unused Indexes' as title,
    'INFO' as level,
    'EXTERNAL' as facing,
    ARRAY['PERFORMANCE'] as categories,
    'Indexes that are never used should be removed' as description,
    'Unused indexes consume storage and slow down writes' as detail,
    'https://supabase.com/docs/guides/database/performance#indexes' as remediation
  UNION ALL
  SELECT 
    'missing_rls' as name,
    'Missing Row Level Security' as title,
    'WARN' as level,
    'EXTERNAL' as facing,
    ARRAY['SECURITY'] as categories,
    'Tables should have Row Level Security policies' as description,
    'Tables without RLS policies may expose sensitive data' as detail,
    'https://supabase.com/docs/guides/auth/row-level-security' as remediation
  UNION ALL
  SELECT 
    'large_tables' as name,
    'Large Tables' as title,
    'INFO' as level,
    'EXTERNAL' as facing,
    ARRAY['PERFORMANCE'] as categories,
    'Tables with many rows should be considered for partitioning' as description,
    'Large tables can impact query performance' as detail,
    'https://supabase.com/docs/guides/database/performance#partitioning' as remediation
  UNION ALL
  SELECT 
    'missing_updated_at_triggers' as name,
    'Missing Updated At Triggers' as title,
    'INFO' as level,
    'EXTERNAL' as facing,
    ARRAY['PERFORMANCE'] as categories,
    'Tables with updated_at columns should have triggers to maintain them' as description,
    'Missing updated_at triggers can lead to stale data' as detail,
    'https://supabase.com/docs/guides/database/design#timestamps' as remediation
  UNION ALL
  SELECT 
    'auth_users_without_profiles' as name,
    'Auth Users Without Profiles' as title,
    'WARN' as level,
    'EXTERNAL' as facing,
    ARRAY['SECURITY'] as categories,
    'Auth users should have corresponding profile records' as description,
    'Users without profiles may have incomplete data' as detail,
    'https://supabase.com/docs/guides/auth/managing-user-data' as remediation
  UNION ALL
  SELECT 
    'storage_buckets_without_policies' as name,
    'Storage Buckets Without Policies' as title,
    'ERROR' as level,
    'EXTERNAL' as facing,
    ARRAY['SECURITY'] as categories,
    'Storage buckets should have access policies' as description,
    'Storage buckets without policies may expose files' as detail,
    'https://supabase.com/docs/guides/storage/security' as remediation
),

-- Check for unindexed foreign keys
unindexed_foreign_keys AS (
  SELECT 
    'unindexed_foreign_keys' as name,
    'Unindexed Foreign Keys' as title,
    'WARN' as level,
    'EXTERNAL' as facing,
    ARRAY['PERFORMANCE'] as categories,
    'Foreign key columns should be indexed for better join performance' as description,
    'Foreign key columns without indexes can cause slow joins' as detail,
    'https://supabase.com/docs/guides/database/performance#indexes' as remediation,
    jsonb_build_object(
      'table_name', tc.table_name,
      'column_name', kcu.column_name,
      'foreign_table', ccu.table_name,
      'foreign_column', ccu.column_name
    ) as metadata,
    'unindexed_foreign_keys_' || tc.table_name || '_' || kcu.column_name as cache_key
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
  LEFT JOIN information_schema.statistics s 
    ON s.table_name = tc.table_name
    AND s.column_name = kcu.column_name
    AND s.table_schema = tc.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND s.index_name IS NULL
),

-- Check for missing primary keys
missing_primary_keys AS (
  SELECT 
    'missing_primary_keys' as name,
    'Missing Primary Keys' as title,
    'ERROR' as level,
    'EXTERNAL' as facing,
    ARRAY['SECURITY'] as categories,
    'Tables should have primary keys for data integrity' as description,
    'Tables without primary keys can cause data integrity issues' as detail,
    'https://supabase.com/docs/guides/database/design#primary-keys' as remediation,
    jsonb_build_object('table_name', t.table_name) as metadata,
    'missing_primary_keys_' || t.table_name as cache_key
  FROM information_schema.tables t
  LEFT JOIN information_schema.table_constraints tc 
    ON tc.table_name = t.table_name
    AND tc.constraint_type = 'PRIMARY KEY'
    AND tc.table_schema = t.table_schema
  WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND tc.constraint_name IS NULL
),

-- Check for missing RLS policies
missing_rls AS (
  SELECT 
    'missing_rls' as name,
    'Missing Row Level Security' as title,
    'WARN' as level,
    'EXTERNAL' as facing,
    ARRAY['SECURITY'] as categories,
    'Tables should have Row Level Security policies' as description,
    'Tables without RLS policies may expose sensitive data' as detail,
    'https://supabase.com/docs/guides/auth/row-level-security' as remediation,
    jsonb_build_object('table_name', t.table_name) as metadata,
    'missing_rls_' || t.table_name as cache_key
  FROM information_schema.tables t
  WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND t.table_name NOT IN ('schema_migrations', 'ar_internal_metadata')
    AND NOT EXISTS (
      SELECT 1 FROM pg_policies p 
      WHERE p.tablename = t.table_name
    )
),

-- Check for large tables (>100k rows)
large_tables AS (
  SELECT 
    'large_tables' as name,
    'Large Tables' as title,
    'INFO' as level,
    'EXTERNAL' as facing,
    ARRAY['PERFORMANCE'] as categories,
    'Tables with many rows should be considered for partitioning' as description,
    'Large tables can impact query performance' as detail,
    'https://supabase.com/docs/guides/database/performance#partitioning' as remediation,
    jsonb_build_object(
      'table_name', schemaname,
      'row_count', n_tup_ins
    ) as metadata,
    'large_tables_' || schemaname as cache_key
  FROM pg_stat_user_tables
  WHERE schemaname = 'public'
    AND n_tup_ins > 100000
),

-- Check for missing updated_at triggers
missing_updated_at_triggers AS (
  SELECT 
    'missing_updated_at_triggers' as name,
    'Missing Updated At Triggers' as title,
    'INFO' as level,
    'EXTERNAL' as facing,
    ARRAY['PERFORMANCE'] as categories,
    'Tables with updated_at columns should have triggers to maintain them' as description,
    'Missing updated_at triggers can lead to stale data' as detail,
    'https://supabase.com/docs/guides/database/design#timestamps' as remediation,
    jsonb_build_object('table_name', t.table_name) as metadata,
    'missing_updated_at_triggers_' || t.table_name as cache_key
  FROM information_schema.tables t
  JOIN information_schema.columns c 
    ON c.table_name = t.table_name
    AND c.table_schema = t.table_schema
  WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND c.column_name = 'updated_at'
    AND NOT EXISTS (
      SELECT 1 FROM pg_trigger tr
      JOIN pg_class cl ON cl.oid = tr.tgrelid
      WHERE cl.relname = t.table_name
        AND tr.tgname LIKE '%_updated_at_trigger'
    )
),

-- Check for auth users without profiles
auth_users_without_profiles AS (
  SELECT 
    'auth_users_without_profiles' as name,
    'Auth Users Without Profiles' as title,
    'WARN' as level,
    'EXTERNAL' as facing,
    ARRAY['SECURITY'] as categories,
    'Auth users should have corresponding profile records' as description,
    'Users without profiles may have incomplete data' as detail,
    'https://supabase.com/docs/guides/auth/managing-user-data' as remediation,
    jsonb_build_object('user_count', COUNT(*)) as metadata,
    'auth_users_without_profiles' as cache_key
  FROM auth.users u
  LEFT JOIN public.users p ON u.id = p.id
  WHERE p.id IS NULL
),

-- Check for storage buckets without policies
storage_buckets_without_policies AS (
  SELECT 
    'storage_buckets_without_policies' as name,
    'Storage Buckets Without Policies' as title,
    'ERROR' as level,
    'EXTERNAL' as facing,
    ARRAY['SECURITY'] as categories,
    'Storage buckets should have access policies' as description,
    'Storage buckets without policies may expose files' as detail,
    'https://supabase.com/docs/guides/storage/security' as remediation,
    jsonb_build_object('bucket_name', b.name) as metadata,
    'storage_buckets_without_policies_' || b.name as cache_key
  FROM storage.buckets b
  WHERE NOT EXISTS (
    SELECT 1 FROM storage.policies p
    WHERE p.bucket_id = b.id
  )
)

-- Combine all lint results
SELECT * FROM unindexed_foreign_keys
UNION ALL
SELECT * FROM missing_primary_keys
UNION ALL
SELECT * FROM missing_rls
UNION ALL
SELECT * FROM large_tables
UNION ALL
SELECT * FROM missing_updated_at_triggers
UNION ALL
SELECT * FROM auth_users_without_profiles
UNION ALL
SELECT * FROM storage_buckets_without_policies
ORDER BY level DESC, name;
`;

class SplinterService {
  /**
   * Run Splinter lints against the database
   */
  static async runLints(): Promise<SplinterReport> {
    try {
      console.log('🔍 Running Supabase Splinter lints...');
      
      const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: SPLINTER_SQL
      });

      if (error) {
        console.error('❌ Error running Splinter lints:', error);
        throw new Error(`Failed to run Splinter lints: ${error.message}`);
      }

      const lints = data || [];
      
      // Calculate summary
      const summary = {
        total: lints.length,
        errors: lints.filter(lint => lint.level === 'ERROR').length,
        warnings: lints.filter(lint => lint.level === 'WARN').length,
        info: lints.filter(lint => lint.level === 'INFO').length,
        security: lints.filter(lint => lint.categories.includes('SECURITY')).length,
        performance: lints.filter(lint => lint.categories.includes('PERFORMANCE')).length,
      };

      console.log(`📊 Splinter report: ${summary.total} issues found`);
      console.log(`   Errors: ${summary.errors}, Warnings: ${summary.warnings}, Info: ${summary.info}`);
      console.log(`   Security: ${summary.security}, Performance: ${summary.performance}`);

      return { lints, summary };
    } catch (error) {
      console.error('❌ Splinter service error:', error);
      throw error;
    }
  }

  /**
   * Get specific lint by name
   */
  static async getLintByName(lintName: string): Promise<SplinterLint[]> {
    try {
      const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: `${SPLINTER_SQL} WHERE name = '${lintName}'`
      });

      if (error) {
        console.error(`❌ Error getting lint ${lintName}:`, error);
        throw new Error(`Failed to get lint ${lintName}: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error(`❌ Error getting lint ${lintName}:`, error);
      throw error;
    }
  }

  /**
   * Get lints by category (SECURITY, PERFORMANCE)
   */
  static async getLintsByCategory(category: 'SECURITY' | 'PERFORMANCE'): Promise<SplinterLint[]> {
    try {
      const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: `${SPLINTER_SQL} WHERE '${category}' = ANY(categories)`
      });

      if (error) {
        console.error(`❌ Error getting ${category} lints:`, error);
        throw new Error(`Failed to get ${category} lints: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error(`❌ Error getting ${category} lints:`, error);
      throw error;
    }
  }

  /**
   * Get lints by level (ERROR, WARN, INFO)
   */
  static async getLintsByLevel(level: 'ERROR' | 'WARN' | 'INFO'): Promise<SplinterLint[]> {
    try {
      const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: `${SPLINTER_SQL} WHERE level = '${level}'`
      });

      if (error) {
        console.error(`❌ Error getting ${level} lints:`, error);
        throw new Error(`Failed to get ${level} lints: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error(`❌ Error getting ${level} lints:`, error);
      throw error;
    }
  }

  /**
   * Format lint for display
   */
  static formatLint(lint: SplinterLint): string {
    const levelEmoji = {
      'ERROR': '❌',
      'WARN': '⚠️',
      'INFO': 'ℹ️'
    };

    const categoryEmoji = {
      'SECURITY': '🔒',
      'PERFORMANCE': '⚡'
    };

    const categories = lint.categories.map(cat => categoryEmoji[cat as keyof typeof categoryEmoji] || cat).join(' ');

    return `${levelEmoji[lint.level]} ${lint.title}
   Level: ${lint.level}
   Categories: ${categories}
   Description: ${lint.description}
   Detail: ${lint.detail}
   ${lint.remediation ? `Remediation: ${lint.remediation}` : ''}
   Cache Key: ${lint.cache_key}
   `;
  }

  /**
   * Generate a formatted report
   */
  static async generateReport(): Promise<string> {
    try {
      const report = await this.runLints();
      
      let output = `# Supabase Splinter Report\n\n`;
      output += `## Summary\n`;
      output += `- Total Issues: ${report.summary.total}\n`;
      output += `- Errors: ${report.summary.errors}\n`;
      output += `- Warnings: ${report.summary.warnings}\n`;
      output += `- Info: ${report.summary.info}\n`;
      output += `- Security Issues: ${report.summary.security}\n`;
      output += `- Performance Issues: ${report.summary.performance}\n\n`;

      if (report.lints.length > 0) {
        output += `## Issues Found\n\n`;
        
        // Group by level
        const byLevel = {
          ERROR: report.lints.filter(l => l.level === 'ERROR'),
          WARN: report.lints.filter(l => l.level === 'WARN'),
          INFO: report.lints.filter(l => l.level === 'INFO')
        };

        for (const [level, lints] of Object.entries(byLevel)) {
          if (lints.length > 0) {
            output += `### ${level} Level Issues (${lints.length})\n\n`;
            for (const lint of lints) {
              output += this.formatLint(lint) + '\n';
            }
          }
        }
      } else {
        output += `## ✅ No Issues Found\n\nYour database looks good! No performance or security issues detected.\n`;
      }

      return output;
    } catch (error) {
      console.error('❌ Error generating report:', error);
      throw error;
    }
  }
}

export default SplinterService; 