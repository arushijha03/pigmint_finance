import { Response } from 'express';
import { query } from '../config/database.js';
import { publishMessage } from '../config/pubsub.js';
import { AuthRequest, CreateTransactionInput, UpdateTransactionInput } from '../types/index.js';

const PUBSUB_TOPIC = process.env.PUBSUB_TOPIC_TRANSACTIONS || 'pigmint-transactions';

export const createTransaction = async (req: AuthRequest, res: Response) => {
  try {
    const { vendor, amount, category, date }: CreateTransactionInput = req.body;
    const userId = req.userId;

    if (!vendor || !amount || !category || !date) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const result = await query(
      `INSERT INTO transactions (user_id, vendor, amount, category, date)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, vendor, amount, category, date]
    );

    const transaction = result.rows[0];

    await publishMessage(PUBSUB_TOPIC, {
      transactionId: transaction.id,
      userId: transaction.user_id,
      vendor: transaction.vendor,
      amount: transaction.amount,
      category: transaction.category,
      date: transaction.date,
      timestamp: new Date().toISOString()
    });

    res.status(201).json(transaction);
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTransactions = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { limit = 50, offset = 0 } = req.query;

    const result = await query(
      `SELECT * FROM transactions
       WHERE user_id = $1
       ORDER BY date DESC, created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateTransaction = async (req: AuthRequest, res: Response) => {
  try {
    const { transactionId } = req.params;
    const { vendor, amount, category, date }: UpdateTransactionInput = req.body;
    const userId = req.userId;

    const checkOwnership = await query(
      'SELECT id FROM transactions WHERE id = $1 AND user_id = $2',
      [transactionId, userId]
    );

    if (checkOwnership.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (vendor !== undefined) {
      updates.push(`vendor = $${paramCount}`);
      values.push(vendor);
      paramCount++;
    }

    if (amount !== undefined) {
      updates.push(`amount = $${paramCount}`);
      values.push(amount);
      paramCount++;
    }

    if (category !== undefined) {
      updates.push(`category = $${paramCount}`);
      values.push(category);
      paramCount++;
    }

    if (date !== undefined) {
      updates.push(`date = $${paramCount}`);
      values.push(date);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(transactionId);

    const result = await query(
      `UPDATE transactions SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteTransaction = async (req: AuthRequest, res: Response) => {
  try {
    const { transactionId } = req.params;
    const userId = req.userId;

    const result = await query(
      'DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING id',
      [transactionId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
