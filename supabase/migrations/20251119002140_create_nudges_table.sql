/*
  # Create Nudges System

  1. New Tables
    - `nudges`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `transaction_id` (uuid, references transactions)
      - `title` (text) - Nudge title
      - `description` (text) - Nudge description
      - `save_amount` (decimal) - Suggested save amount
      - `nudge_type` (text) - Type: 'round_up', 'vendor_pattern', 'category_pattern'
      - `is_dismissed` (boolean, default false)
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on nudges table
    - Add policies for authenticated users to view/update their own nudges
  
  3. Indexes
    - Add index on user_id and is_dismissed for fast queries
*/

CREATE TABLE IF NOT EXISTS nudges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  transaction_id uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  save_amount decimal(10,2) NOT NULL,
  nudge_type text NOT NULL DEFAULT 'round_up',
  is_dismissed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE nudges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own nudges"
  ON nudges FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own nudges"
  ON nudges FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own nudges"
  ON nudges FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE INDEX IF NOT EXISTS idx_nudges_user_id_dismissed ON nudges(user_id, is_dismissed);
CREATE INDEX IF NOT EXISTS idx_nudges_transaction_id ON nudges(transaction_id);

-- Function to create round-up nudge for a transaction
CREATE OR REPLACE FUNCTION create_roundup_nudge(p_transaction_id uuid, p_user_id uuid, p_vendor text, p_amount decimal)
RETURNS void AS $$
DECLARE
  v_roundup_amount decimal;
  v_rounded_amount decimal;
BEGIN
  v_rounded_amount := CEIL(p_amount);
  v_roundup_amount := v_rounded_amount - p_amount;
  
  IF v_roundup_amount > 0 THEN
    INSERT INTO nudges (user_id, transaction_id, title, description, save_amount, nudge_type)
    VALUES (
      p_user_id,
      p_transaction_id,
      'Round-Up & Save',
      'You spent $' || p_amount::text || ' at ' || p_vendor || '. Want to save the $' || v_roundup_amount::text || ' round-up?',
      v_roundup_amount,
      'round_up'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create nudges when transactions are inserted
CREATE OR REPLACE FUNCTION trigger_create_transaction_nudges()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_roundup_nudge(NEW.id, NEW.user_id, NEW.vendor, NEW.amount);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER create_transaction_nudges_trigger
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_create_transaction_nudges();

-- Create nudges for existing transactions that don't have nudges yet
INSERT INTO nudges (user_id, transaction_id, title, description, save_amount, nudge_type)
SELECT 
  t.user_id,
  t.id,
  'Round-Up & Save',
  'You spent $' || t.amount::text || ' at ' || t.vendor || '. Want to save the $' || (CEIL(t.amount) - t.amount)::text || ' round-up?',
  CEIL(t.amount) - t.amount,
  'round_up'
FROM transactions t
WHERE (CEIL(t.amount) - t.amount) > 0
  AND NOT EXISTS (
    SELECT 1 FROM nudges n 
    WHERE n.transaction_id = t.id 
    AND n.nudge_type = 'round_up'
  );
