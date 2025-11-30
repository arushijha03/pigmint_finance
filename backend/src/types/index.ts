import { Request } from 'express';

export interface AuthRequest extends Request {
  userId?: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  monthly_income?: number;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface UpdateProfileInput {
  monthly_income?: number;
  name?: string;
}

export interface CreateTransactionInput {
  vendor: string;
  amount: number;
  category: string;
  date: string;
}

export interface UpdateTransactionInput {
  vendor?: string;
  amount?: number;
  category?: string;
  date?: string;
}

export interface CreateGoalInput {
  title: string;
  target_amount: number;
}

export interface CreateRuleInput {
  vendor_match: string;
  save_amount: number;
  rule_type?: string;
}

export interface ToggleAutomatedRuleInput {
  enabled: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  monthly_income: number;
  created_at: Date;
}

export interface Transaction {
  id: string;
  user_id: string;
  vendor: string;
  amount: number;
  category: string;
  date: string;
  created_at: Date;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  created_at: Date;
}

export interface Rule {
  id: string;
  user_id: string;
  vendor_match: string;
  save_amount: number;
  rule_type: string;
  is_active: boolean;
  created_at: Date;
}
