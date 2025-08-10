# Supabase Database Fixes & Monitoring Guide

## 🚨 Critical Issues Identified

### 1. Missing Subscriptions Table
- **Issue**: The `subscriptions` table is missing or inaccessible
- **Impact**: Subscription-related queries fail, affecting user management
- **Solution**: Create the table with correct UUID foreign key types

### 2. Missing Performance Indexes
- **Issue**: No indexes on frequently queried columns
- **Impact**: Slow query performance, especially for bookings and classes
- **Solution**: Add recommended indexes

### 3. Missing exec_sql Function
- **Issue**: No programmatic SQL execution capability
- **Impact**: Cannot run database fixes via scripts
- **Solution**: Create the exec_sql RPC function

## 🔧 Manual Fixes Required

### Step 1: Execute SQL Commands in Supabase Dashboard

1. **Open your Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project
   - Navigate to SQL Editor

2. **Execute the SQL Fixes**
   - Copy the contents of `backend/scripts/manual_sql_fixes.sql`
   - Paste into the SQL Editor
   - Click "Run" to execute all commands

3. **Verify the Fixes**
   - Check that the `subscriptions` table was created
   - Verify indexes were created successfully
   - Confirm the `exec_sql` function exists

### Step 2: Test the Fixes

Run the verification script to confirm everything is working:

```bash
cd backend
node scripts/fix_missing_subscriptions_table.js
```

## 📊 Database Performance Monitoring

### Automated Monitoring Scripts

1. **Basic Monitoring** (`simple_db_monitor.js`)
   ```bash
   node scripts/simple_db_monitor.js
   ```
   - Table row counts
   - Recent activity analysis
   - Performance metrics
   - Recommendations

2. **Advanced Monitoring** (`advanced_db_monitor.js`)
   ```bash
   node scripts/advanced_db_monitor.js
   ```
   - Detailed performance analysis
   - Index usage statistics
   - Slow query identification
   - Cache hit rates

### Key Performance Metrics to Monitor

1. **Query Performance**
   - Response times for common queries
   - Slow query identification
   - Index usage efficiency

2. **Database Health**
   - Connection pool usage
   - Lock contention
   - Cache hit rates
   - Table sizes and growth

3. **Application Metrics**
   - User activity patterns
   - Booking frequency
   - Payment processing times

## 🚀 Optimization Strategies

### 1. Index Optimization
- Monitor query patterns and add indexes as needed
- Remove unused indexes to improve write performance
- Use composite indexes for multi-column queries

### 2. Query Optimization
- Use prepared statements
- Implement query result caching
- Optimize JOIN operations

### 3. Data Management
- Implement data archiving for old records
- Regular cleanup of temporary data
- Monitor table growth and plan for scaling

### 4. Connection Management
- Optimize connection pool settings
- Monitor connection usage patterns
- Implement connection pooling best practices

## 📈 Scaling Considerations

### Current Database Size
- Monitor table sizes and growth rates
- Plan for data archiving when tables exceed 1M rows
- Consider partitioning for large tables

### Performance Thresholds
- Query response time: < 100ms for common operations
- Index usage: > 90% for frequently used indexes
- Cache hit rate: > 95% for read-heavy operations

### Monitoring Schedule
- **Daily**: Run basic monitoring script
- **Weekly**: Run advanced monitoring and analyze trends
- **Monthly**: Review performance metrics and plan optimizations

## 🔍 Troubleshooting

### Common Issues

1. **"relation does not exist"**
   - Check if table was created successfully
   - Verify RLS policies allow access
   - Ensure correct schema permissions

2. **"function not found"**
   - Verify exec_sql function was created
   - Check function permissions
   - Ensure service role has access

3. **Slow Query Performance**
   - Check if indexes exist and are being used
   - Analyze query execution plans
   - Consider query optimization

### Debugging Steps

1. **Check Table Existence**
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' AND table_name = 'subscriptions';
   ```

2. **Verify Indexes**
   ```sql
   SELECT indexname, tablename FROM pg_indexes 
   WHERE tablename IN ('bookings', 'classes', 'subscriptions');
   ```

3. **Test Function Access**
   ```sql
   SELECT exec_sql('SELECT 1');
   ```

## 📋 Maintenance Checklist

### Daily Tasks
- [ ] Run basic monitoring script
- [ ] Check for any error alerts
- [ ] Monitor query performance

### Weekly Tasks
- [ ] Run advanced monitoring script
- [ ] Analyze performance trends
- [ ] Review and optimize slow queries
- [ ] Check index usage statistics

### Monthly Tasks
- [ ] Review database growth
- [ ] Plan for scaling needs
- [ ] Update monitoring thresholds
- [ ] Archive old data if needed

## 🎯 Success Metrics

### Performance Targets
- **Query Response Time**: < 100ms for 95% of queries
- **Index Usage**: > 90% for frequently used indexes
- **Cache Hit Rate**: > 95% for read operations
- **Error Rate**: < 0.1% for database operations

### Monitoring Alerts
- Set up alerts for:
  - Query response times > 500ms
  - Error rates > 1%
  - Connection pool usage > 80%
  - Table sizes growing > 10% per week

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review the monitoring scripts output
3. Consult Supabase documentation
4. Consider reaching out to Supabase support for complex issues

---

**Last Updated**: December 2024
**Version**: 1.0 