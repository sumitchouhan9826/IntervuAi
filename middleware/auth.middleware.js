/**
 * Authentication Middleware
 * Uses Clerk's Express SDK to handle authentication.
 * - clerkMiddleware: Attaches Clerk auth info to requests
 * - requireAuth: Rejects unauthenticated requests using getAuth()
 * - getAuthUser: Custom middleware that extracts the userId from getAuth(req)
 */

import { clerkMiddleware, getAuth } from '@clerk/express';

/**
 * Initialize Clerk middleware — attaches auth state to every request.
 * Should be applied globally in the Express app.
 */
export const clerkAuth = clerkMiddleware();

/**
 * Require authentication — returns 401 if the user is not authenticated.
 * Use on protected routes.
 */
export const requireAuth = (options = {}) => {
  return (req, res, next) => {
    try {
      const { userId } = getAuth(req);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required. No user ID found.',
        });
      }

      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(401).json({
        success: false,
        message: 'Authentication failed.',
      });
    }
  };
};

/**
 * Require authentication — returns 401 if the user is not authenticated.
 * Use on protected routes. For backward compatibility with existing usages of protect.
 */
export const protect = requireAuth;

/**
 * Extract authenticated user ID from Clerk's auth object.
 * Must be used AFTER clerkMiddleware.
 * Sets req.userId for downstream controllers.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const getAuthUser = (req, res, next) => {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No user ID found.',
      });
    }

    // Attach userId to request for easy access in controllers
    req.userId = userId;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({
      success: false,
      message: 'Authentication failed.',
    });
  }
};

