/*
  # Fix Security and Performance Issues

  1. Index Improvements
    - Add indexes for foreign keys on savings_actions table (goal_id, transaction_id)
    - Remove unused index on transactions.date
  
  2. RLS Policy Optimization
    - Update all RLS policies to use (select auth.uid()) instead of auth.uid()
    - This prevents re-evaluation of auth function for each row, improving performance at scale
  
  3. Tables Updated
    - profiles: 3 policies optimized
    - goals: 4 policies optimized  
    - transactions: 4 policies optimized
    - rules: 4 policies optimized
    - savings_actions: 2 policies optimized + 2 indexes added
*/

-- Add missing indexes for foreign keys on savings_actions
CREATE INDEX IF NOT EXISTS idx_savings_actions_goal_id ON savings_actions(goal_id);
CREATE INDEX IF NOT EXISTS idx_savings_actions_transaction_id ON savings_actions(transaction_id);

-- Remove unused index
DROP INDEX IF EXISTS idx_transactions_date;

-- ============================================
-- Optimize RLS Policies - PROFILES TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- ============================================
-- Optimize RLS Policies - GOALS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view own goals" ON goals;
CREATE POLICY "Users can view own goals"
  ON goals FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own goals" ON goals;
CREATE POLICY "Users can insert own goals"
  ON goals FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own goals" ON goals;
CREATE POLICY "Users can update own goals"
  ON goals FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own goals" ON goals;
CREATE POLICY "Users can delete own goals"
  ON goals FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- ============================================
-- Optimize RLS Policies - TRANSACTIONS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own transactions" ON transactions;
CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own transactions" ON transactions;
CREATE POLICY "Users can update own transactions"
  ON transactions FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own transactions" ON transactions;
CREATE POLICY "Users can delete own transactions"
  ON transactions FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- ============================================
-- Optimize RLS Policies - RULES TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view own rules" ON rules;
CREATE POLICY "Users can view own rules"
  ON rules FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own rules" ON rules;
CREATE POLICY "Users can insert own rules"
  ON rules FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own rules" ON rules;
CREATE POLICY "Users can update own rules"
  ON rules FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own rules" ON rules;
CREATE POLICY "Users can delete own rules"
  ON rules FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- ============================================
-- Optimize RLS Policies - SAVINGS_ACTIONS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view own savings actions" ON savings_actions;
CREATE POLICY "Users can view own savings actions"
  ON savings_actions FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own savings actions" ON savings_actions;
CREATE POLICY "Users can insert own savings actions"
  ON savings_actions FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);