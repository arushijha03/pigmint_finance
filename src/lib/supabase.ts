import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  name: string;
  email: string;
  monthly_income: number;
  created_at: string;
  updated_at: string;
};

export type Goal = {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  created_at: string;
  updated_at: string;
};

export type Transaction = {
  id: string;
  user_id: string;
  vendor: string;
  amount: number;
  category: string;
  date: string;
  created_at: string;
};

export type Rule = {
  id: string;
  user_id: string;
  name: string;
  type: 'automated' | 'custom';
  enabled: boolean;
  condition_type: string | null;
  condition_value: string | null;
  action_amount: number | null;
  created_at: string;
};

export type SavingsAction = {
  id: string;
  user_id: string;
  transaction_id: string | null;
  goal_id: string | null;
  amount: number;
  type: string;
  description: string;
  created_at: string;
};

export type Nudge = {
  id: string;
  user_id: string;
  transaction_id: string;
  title: string;
  description: string;
  save_amount: number;
  nudge_type: string;
  is_dismissed: boolean;
  created_at: string;
};
