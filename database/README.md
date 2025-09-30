# Database Schema Documentation

This directory contains the modular database schema for the ParakeetAI application. The schema is organized into separate files for better maintainability and clarity.

## 📁 Schema Structure

```
database/
├── schemas/
│   ├── 00_functions_and_triggers.sql    # Shared functions and triggers
│   ├── 01_users.sql                     # Users table and related
│   ├── 02_interview_sessions.sql        # Interview sessions table
│   ├── 03_user_settings.sql             # User preferences and settings
│   ├── 04_billing_subscriptions.sql     # Billing and subscription data
│   ├── 05_audit_logs.sql                # Audit trail and logging
│   └── 99_main_schema.sql               # Main schema file with instructions
└── README.md                            # This documentation
```

## 🚀 Quick Setup

### Option 1: Run Individual Files (Recommended)
Run the schema files in this order in your Supabase SQL editor:

1. `00_functions_and_triggers.sql`
2. `01_users.sql`
3. `02_interview_sessions.sql`
4. `03_user_settings.sql`
5. `04_billing_subscriptions.sql`
6. `05_audit_logs.sql`

### Option 2: Use Main Schema File
Run `99_main_schema.sql` which contains instructions and references to all other schemas.

## 📊 Database Tables

### 1. Users Table (`users`)
- **Purpose**: Stores user account information and authentication data
- **Key Fields**: `id`, `email`, `name`, `password_hash`, `approved`
- **Features**: RLS enabled, automatic timestamp updates, audit logging

### 2. Interview Sessions Table (`interview_sessions`)
- **Purpose**: Stores interview session data and progress tracking
- **Key Fields**: `id`, `user_id`, `session_type`, `company`, `position`, `status`, `ai_usage`
- **Features**: Foreign key to users, status tracking, AI usage monitoring

### 3. User Settings Table (`user_settings`)
- **Purpose**: Stores user preferences and application settings
- **Key Fields**: `id`, `user_id`, `notifications`, `privacy`, `preferences`
- **Features**: JSONB columns for flexible settings, auto-created with new users

### 4. Billing Subscriptions Table (`billing_subscriptions`)
- **Purpose**: Manages billing information and subscription data
- **Key Fields**: `id`, `user_id`, `plan_type`, `status`, `credits_remaining`, `stripe_customer_id`
- **Features**: Stripe integration ready, credit system, plan management

### 5. Audit Logs Table (`audit_logs`)
- **Purpose**: Tracks all user actions and system events for security and debugging
- **Key Fields**: `id`, `user_id`, `action`, `resource_type`, `old_values`, `new_values`
- **Features**: Automatic logging, JSONB for flexible data storage

## 🔧 Key Features

### Row Level Security (RLS)
- All tables have RLS enabled
- Users can only access their own data
- Service role has full access for API operations

### Automatic Timestamps
- `created_at` and `updated_at` fields on all tables
- Automatic updates via triggers
- Consistent timestamp management

### Audit Logging
- Automatic audit trail for all changes
- Tracks old and new values
- Includes IP address and user agent
- Session-based tracking

### Performance Optimization
- Strategic indexes on frequently queried columns
- Foreign key relationships properly indexed
- JSONB columns for flexible data storage

### Data Validation
- Check constraints for data integrity
- Proper data types and lengths
- Foreign key constraints for referential integrity

## 🔐 Security Features

### Authentication
- Password hashing with bcrypt
- Email-based authentication
- Admin approval system

### Authorization
- Row Level Security policies
- Role-based access control
- Service role for API operations

### Audit Trail
- Complete change tracking
- User action logging
- Security event monitoring

## 📈 Scalability Considerations

### Indexing Strategy
- Primary keys and foreign keys indexed
- Frequently queried columns indexed
- Composite indexes for complex queries

### Data Types
- UUID primary keys for distributed systems
- JSONB for flexible schema evolution
- Proper data type sizing

### Performance
- Efficient query patterns
- Minimal N+1 query problems
- Optimized for common use cases

## 🛠️ Maintenance

### Adding New Tables
1. Create new schema file in `schemas/` directory
2. Follow naming convention: `XX_table_name.sql`
3. Include proper documentation and comments
4. Update this README with table information

### Modifying Existing Tables
1. Create migration scripts for production
2. Update schema files
3. Test thoroughly in development
4. Update documentation

### Backup and Recovery
- Regular database backups recommended
- Point-in-time recovery available
- Schema versioning through Git

## 📝 Sample Data

The main schema file (`99_main_schema.sql`) includes commented sample data for testing:

```sql
-- Uncomment to insert sample admin user
INSERT INTO users (email, name, password_hash, approved) 
VALUES ('admin@parakeetai.com', 'Admin User', '$2a$12$...', true);
```

## 🔍 Monitoring and Debugging

### Audit Logs
Query audit logs to track user actions:
```sql
SELECT * FROM audit_logs 
WHERE user_id = 'user-uuid' 
ORDER BY created_at DESC;
```

### Performance Monitoring
Monitor query performance using Supabase dashboard:
- Query execution times
- Index usage
- Connection metrics

## 📞 Support

For questions about the database schema:
1. Check this documentation
2. Review the individual schema files
3. Check the main schema file for setup instructions
4. Contact the development team

---

**Note**: This schema is designed for the ParakeetAI application. Modify as needed for your specific requirements.


