/*
  # Add password_hash column to profiles table

  1. Changes
    - Add password_hash column to profiles table for custom authentication
    - This column stores bcrypt-hashed passwords for the Express API authentication
  
  2. Security
    - Column is nullable to maintain compatibility with existing Supabase Auth users
    - For API-based authentication, this field will be required
*/

-- Add password_hash column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;
