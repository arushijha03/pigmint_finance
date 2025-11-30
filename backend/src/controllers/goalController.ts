import { Response } from 'express';
import { query } from '../config/database.js';
import { AuthRequest, CreateGoalInput } from '../types/index.js';

export const createGoal = async (req: AuthRequest, res: Response) => {
  try {
    const { title, target_amount }: CreateGoalInput = req.body;
    const userId = req.userId;

    if (!title || !target_amount) {
      return res.status(400).json({ error: 'Title and target_amount are required' });
    }

    const result = await query(
      `INSERT INTO goals (user_id, title, target_amount, current_amount)
       VALUES ($1, $2, $3, 0)
       RETURNING *`,
      [userId, title, target_amount]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create goal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getGoals = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    if (req.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const result = await query(
      `SELECT
        g.id,
        g.user_id,
        g.title,
        g.target_amount,
        COALESCE(SUM(sa.amount), 0) as current_amount,
        g.created_at
       FROM goals g
       LEFT JOIN savings_actions sa ON g.id = sa.goal_id
       WHERE g.user_id = $1
       GROUP BY g.id, g.user_id, g.title, g.target_amount, g.created_at
       ORDER BY g.created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get goals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateGoal = async (req: AuthRequest, res: Response) => {
  try {
    const { goalId } = req.params;
    const { title, target_amount } = req.body;
    const userId = req.userId;

    const checkOwnership = await query(
      'SELECT id FROM goals WHERE id = $1 AND user_id = $2',
      [goalId, userId]
    );

    if (checkOwnership.rows.length === 0) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramCount}`);
      values.push(title);
      paramCount++;
    }

    if (target_amount !== undefined) {
      updates.push(`target_amount = $${paramCount}`);
      values.push(target_amount);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(goalId);

    const result = await query(
      `UPDATE goals SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update goal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteGoal = async (req: AuthRequest, res: Response) => {
  try {
    const { goalId } = req.params;
    const userId = req.userId;

    const result = await query(
      'DELETE FROM goals WHERE id = $1 AND user_id = $2 RETURNING id',
      [goalId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Delete goal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
