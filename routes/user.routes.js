import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { syncUser, getProfile, updateProfile, getRecentActivity } from '../controllers/user.controller.js';

const router = Router();

// POST /api/users/sync - Sync Clerk user data (no auth required, called from webhook/client)
router.post('/sync', syncUser);

// GET /api/users/profile - Get authenticated user's profile
router.get('/profile', requireAuth(), getProfile);

// PUT /api/users/profile - Update authenticated user's profile
router.put('/profile', requireAuth(), updateProfile);

// GET /api/users/activity - Get authenticated user's recent activities
router.get('/activity', requireAuth(), getRecentActivity);

export default router;
