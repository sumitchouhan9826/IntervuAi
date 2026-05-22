import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { uploadResume, uploadMiddleware, analyzeResumeHandler, getAnalyses, getAnalysis } from '../controllers/resume.controller.js';

const router = Router();

// All resume routes require authentication
router.use(requireAuth());

// POST /api/resume/upload - Upload a resume file (multipart form-data)
router.post('/upload', uploadMiddleware, uploadResume);

// POST /api/resume/analyze - Analyze resume text with AI
router.post('/analyze', analyzeResumeHandler);

// GET /api/resume/analyses - List all resume analyses for the user
router.get('/analyses', getAnalyses);

// GET /api/resume/analyses/:id - Get a single resume analysis by ID
router.get('/analyses/:id', getAnalysis);

export default router;
