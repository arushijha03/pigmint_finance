import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  createRule,
  updateRule,
  deleteRule,
  toggleAutomatedRule
} from '../controllers/ruleController.js';

const router = express.Router();

router.post('/', authenticate, createRule);
router.patch('/:ruleId', authenticate, updateRule);
router.delete('/:ruleId', authenticate, deleteRule);
router.patch('/automated/:type', authenticate, toggleAutomatedRule);

export default router;
