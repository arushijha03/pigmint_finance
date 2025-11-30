import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { getProfile, updateProfile } from '../controllers/userController.js';
import { getGoals } from '../controllers/goalController.js';
import { getRules } from '../controllers/ruleController.js';
import { getDashboard } from '../controllers/reportController.js';

const router = express.Router();

router.get('/:userId', authenticate, getProfile);
router.patch('/:userId', authenticate, updateProfile);
router.get('/:userId/goals', authenticate, getGoals);
router.get('/:userId/rules', authenticate, getRules);
router.get('/:userId/reports/dashboard', authenticate, getDashboard);

export default router;
