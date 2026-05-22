import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  generateInterview,
  submitAnswer,
  completeInterview,
  listInterviews,
  getStats,
  getInterview,
  deleteInterview,
} from '../controllers/interview.controller.js';

const router = Router();

// All interview routes require authentication
router.use(requireAuth());

// POST /api/interviews/generate - Generate a new AI interview
router.post('/generate', generateInterview);

// POST /api/interviews/:id/answer - Submit an answer for a question
router.post('/:id/answer', submitAnswer);

// POST /api/interviews/:id/complete - Mark interview as complete and get feedback
router.post('/:id/complete', completeInterview);

// GET /api/interviews/stats - Get user's interview statistics
router.get('/stats', getStats);

// GET /api/interviews - List all interviews for the user
router.get('/', listInterviews);

// GET /api/interviews/:id - Get a single interview by ID
router.get('/:id', getInterview);

// DELETE /api/interviews/:id - Delete an interview
router.delete('/:id', deleteInterview);

export default router;
