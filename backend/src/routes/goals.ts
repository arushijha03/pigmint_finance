import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  createGoal,
  updateGoal,
  deleteGoal
} from '../controllers/goalController.js';

const router = express.Router();

router.post('/', authenticate, createGoal);
router.patch('/:goalId', authenticate, updateGoal);
router.delete('/:goalId', authenticate, deleteGoal);

export default router;
