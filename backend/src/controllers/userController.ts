import { Response } from 'express';
import { query } from '../config/database.js';
import { AuthRequest, UpdateProfileInput } from '../types/index.js';

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    if (req.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const result = await query(
      'SELECT id, name, email, monthly_income, created_at FROM profiles WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { monthly_income, name }: UpdateProfileInput = req.body;

    if (req.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }

    if (monthly_income !== undefined) {
      updates.push(`monthly_income = $${paramCount}`);
      values.push(monthly_income);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(userId);

    const result = await query(
      `UPDATE profiles SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING id, name, email, monthly_income, created_at`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
