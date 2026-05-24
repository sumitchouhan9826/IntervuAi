import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { expensiveLimiter } from '../middleware/rateLimiter.middleware.js';
import { analyzeJD, getAnalyses, getAnalysis } from '../controllers/jd.controller.js';

const router = Router();

// All JD routes require authentication
router.use(requireAuth());

// POST /api/jd/analyze - Analyze a job description with AI
router.post('/analyze', expensiveLimiter, analyzeJD);

// GET /api/jd/analyses - List all JD analyses for the user
router.get('/analyses', getAnalyses);

// GET /api/jd/analyses/:id - Get a single JD analysis by ID
router.get('/analyses/:id', getAnalysis);

export default router;
