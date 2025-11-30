/*
  # Optimize Database Indexes

  1. Analysis
    - idx_nudges_user_id_dismissed: KEEP - Used by Dashboard query (user_id + is_dismissed filter)
    - idx_nudges_transaction_id: REMOVE - Not currently used in any queries
    - idx_savings_actions_goal_id: KEEP - Will be used for goal progress calculations
    - idx_savings_actions_transaction_id: REMOVE - Not currently used in any queries
  
  2. Changes
    - Drop unused indexes that don't match current query patterns
    - Keep indexes that are actively used or will be used for common queries
  
  3. Performance
    - Reduces index maintenance overhead
    - Keeps only useful indexes for current application queries
*/

-- Remove indexes that are not being used by current query patterns
DROP INDEX IF EXISTS idx_nudges_transaction_id;
DROP INDEX IF EXISTS idx_savings_actions_transaction_id;

-- Note: Keeping idx_nudges_user_id_dismissed (used in Dashboard)
-- Note: Keeping idx_savings_actions_goal_id (used in goal calculations)
