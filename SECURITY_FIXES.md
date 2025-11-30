# Security Fixes Applied

## Fixed Issues

### 1. Function Search Path Mutable ✅ FIXED

**Issue**: Functions `create_roundup_nudge` and `trigger_create_transaction_nudges` had role mutable search_path, making them vulnerable to schema injection attacks.

**Fix Applied**:
- Added explicit `SET search_path = public` to both functions
- This prevents malicious actors from manipulating the search path
- Functions now only look in the public schema

**Migration**: `fix_security_issues_v2.sql`

**Verification**: Both functions now have `config_settings: ["search_path=public"]`

### 2. Unused Indexes ✅ FIXED

**Issue**: Several indexes were created but not being used by current queries, triggering security scanner warnings.

**Analysis Performed**:
- Analyzed all database queries in the application
- Identified which indexes match actual query patterns
- Removed indexes that don't provide value for current workload

**Fix Applied**:
- ❌ Removed `idx_nudges_transaction_id` - Not used in any current queries
- ❌ Removed `idx_savings_actions_transaction_id` - Not used in any current queries
- ✅ Kept `idx_nudges_user_id_dismissed` - Actively used by Dashboard (filters nudges by user_id and is_dismissed)
- ✅ Kept `idx_savings_actions_goal_id` - Used for goal progress calculations

**Migration**: `optimize_indexes.sql`

**Result**: Database now only maintains indexes that match actual query patterns, reducing maintenance overhead and eliminating security warnings.

## Manual Configuration Required

### 3. Leaked Password Protection (REQUIRES DASHBOARD CONFIG)

**Issue**: Supabase Auth's HaveIBeenPwned integration is not enabled.

**Action Required**: Enable this feature through the Supabase Dashboard:

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Policies**
3. Find the **Security** section
4. Enable **"Password dictionary attacks protection"** or **"HIBP (Have I Been Pwned) check"**
5. Save the changes

**What This Does**:
- Checks user passwords against the HaveIBeenPwned database during signup and password changes
- Prevents users from using compromised passwords
- Enhances overall account security

**Note**: This setting cannot be enabled via SQL migrations as it's a Supabase platform configuration, not a database setting.

## Security Best Practices Implemented

1. **Row Level Security (RLS)**: Enabled on all tables
2. **Explicit Search Paths**: All functions use `SET search_path = public`
3. **Security Definer Functions**: Functions run with definer privileges but are restricted to public schema
4. **Proper Authentication Checks**: All policies verify `auth.uid()` for ownership
5. **Cascading Deletes**: Foreign keys properly cascade to prevent orphaned data

## Additional Recommendations

1. **Enable Leaked Password Protection** (see above)
2. **Rotate JWT Secret**: Periodically rotate your JWT secret in production
3. **Monitor Database Logs**: Enable and review database logs for suspicious activity
4. **Regular Security Audits**: Run Supabase's security scanner periodically
5. **Keep Dependencies Updated**: Regularly update Supabase client libraries

## Summary

- ✅ Function search path vulnerabilities **FIXED**
- ✅ Unused indexes **REMOVED** (optimized for current query patterns)
- ✅ Database security properly configured
- ✅ RLS policies in place
- ⚠️ Leaked password protection requires manual dashboard configuration
