import { Response } from 'express';
import { query } from '../config/database.js';
import { AuthRequest } from '../types/index.js';

export const getDashboard = async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;

    if (req.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const savingsTrendQuery = await query(
      `SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'Mon') as month,
        SUM(amount) as amount
       FROM savings_actions
       WHERE user_id = $1
       AND created_at >= NOW() - INTERVAL '12 months'
       GROUP BY DATE_TRUNC('month', created_at)
       ORDER BY DATE_TRUNC('month', created_at)`,
      [userId]
    );

    const expenseByCategoryQuery = await query(
      `SELECT
        category,
        SUM(amount) as amount
       FROM transactions
       WHERE user_id = $1
       AND date >= NOW() - INTERVAL '30 days'
       GROUP BY category
       ORDER BY amount DESC`,
      [userId]
    );

    const profileQuery = await query(
      'SELECT monthly_income FROM profiles WHERE id = $1',
      [userId]
    );

    const totalSavingsQuery = await query(
      `SELECT COALESCE(SUM(amount), 0) as total_savings
       FROM savings_actions
       WHERE user_id = $1
       AND created_at >= NOW() - INTERVAL '30 days'`,
      [userId]
    );

    const monthlyIncome = profileQuery.rows[0]?.monthly_income || 0;
    const totalSavings = parseFloat(totalSavingsQuery.rows[0]?.total_savings || 0);
    const incomeSavedPercentage = monthlyIncome > 0
      ? (totalSavings / monthlyIncome) * 100
      : 0;

    res.json({
      savings_trend: savingsTrendQuery.rows.map(row => ({
        month: row.month,
        amount: parseFloat(row.amount)
      })),
      expense_by_category: expenseByCategoryQuery.rows.map(row => ({
        category: row.category,
        amount: parseFloat(row.amount)
      })),
      income_saved_percentage: parseFloat(incomeSavedPercentage.toFixed(2))
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
