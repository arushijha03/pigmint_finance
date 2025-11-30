/*
  # Fix Security Issues

  1. Changes
    - Set explicit search_path on functions to prevent search path mutable vulnerabilities
    - Functions will now only look in public schema, making them immutable
  
  2. Security
    - Fixes: Function Search Path Mutable vulnerabilities
    - Makes functions more secure by preventing schema injection attacks
*/

-- Drop trigger first
DROP TRIGGER IF EXISTS create_transaction_nudges_trigger ON transactions;

-- Drop existing functions
DROP FUNCTION IF EXISTS create_roundup_nudge(uuid, uuid, text, decimal);
DROP FUNCTION IF EXISTS trigger_create_transaction_nudges();

-- Recreate function with explicit search_path
CREATE OR REPLACE FUNCTION create_roundup_nudge(p_transaction_id uuid, p_user_id uuid, p_vendor text, p_amount decimal)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Recreate trigger function with explicit search_path
CREATE OR REPLACE FUNCTION trigger_create_transaction_nudges()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM create_roundup_nudge(NEW.id, NEW.user_id, NEW.vendor, NEW.amount);
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER create_transaction_nudges_trigger
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_create_transaction_nudges();
