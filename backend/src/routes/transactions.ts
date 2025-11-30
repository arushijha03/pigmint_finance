import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  createTransaction,
  getTransactions,
  updateTransaction,
  deleteTransaction
} from '../controllers/transactionController.js';

const router = express.Router();

router.post('/', authenticate, createTransaction);
router.get('/', authenticate, getTransactions);
router.patch('/:transactionId', authenticate, updateTransaction);
router.delete('/:transactionId', authenticate, deleteTransaction);

export default router;
