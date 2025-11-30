import { Response } from 'express';
import { query } from '../config/database.js';
import { AuthRequest, CreateRuleInput, ToggleAutomatedRuleInput } from '../types/index.js';

export const createRule = async (req: AuthRequest, res: Response) => {
  try {
    const { vendor_match, save_amount, rule_type = 'vendor-match' }: CreateRuleInput = req.body;
    const userId = req.userId;

    if (!vendor_match || !save_amount) {
      return res.status(400).json({ error: 'vendor_match and save_amount are required' });
    }

    const result = await query(
      `INSERT INTO rules (user_id, vendor_match, save_amount, rule_type, is_active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING *`,
      [userId, vendor_match, save_amount, rule_type]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create rule error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getRules = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    if (req.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const result = await query(
      `SELECT * FROM rules
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get rules error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateRule = async (req: AuthRequest, res: Response) => {
  try {
    const { ruleId } = req.params;
    const { vendor_match, save_amount, is_active } = req.body;
    const userId = req.userId;

    const checkOwnership = await query(
      'SELECT id FROM rules WHERE id = $1 AND user_id = $2',
      [ruleId, userId]
    );

    if (checkOwnership.rows.length === 0) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (vendor_match !== undefined) {
      updates.push(`vendor_match = $${paramCount}`);
      values.push(vendor_match);
      paramCount++;
    }

    if (save_amount !== undefined) {
      updates.push(`save_amount = $${paramCount}`);
      values.push(save_amount);
      paramCount++;
    }

    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount}`);
      values.push(is_active);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(ruleId);

    const result = await query(
      `UPDATE rules SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update rule error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteRule = async (req: AuthRequest, res: Response) => {
  try {
    const { ruleId } = req.params;
    const userId = req.userId;

    const result = await query(
      'DELETE FROM rules WHERE id = $1 AND user_id = $2 RETURNING id',
      [ruleId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Delete rule error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const toggleAutomatedRule = async (req: AuthRequest, res: Response) => {
  try {
    const { type } = req.params;
    const { enabled }: ToggleAutomatedRuleInput = req.body;
    const userId = req.userId;

    if (enabled === undefined) {
      return res.status(400).json({ error: 'enabled field is required' });
    }

    const result = await query(
      `UPDATE rules
       SET is_active = $1
       WHERE user_id = $2 AND rule_type = $3
       RETURNING *`,
      [enabled, userId, type]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No rules found for this type' });
    }

    res.json({
      message: `${type} rules ${enabled ? 'enabled' : 'disabled'}`,
      affected_rules: result.rows
    });
  } catch (error) {
    console.error('Toggle automated rule error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
