/**
 * User Controller
 * Handles user profile sync with Clerk, profile retrieval, and updates.
 */

import User from '../models/User.js';
import { getAuth } from '@clerk/express';

/**
 * POST /api/users/sync
 * Create or update a user in MongoDB from Clerk webhook/client data.
 * Called after Clerk authentication to keep local DB in sync.
 */
export const syncUser = async (req, res) => {
  try {
    const { clerkId, email, firstName, lastName, profileImage } = req.body;

    // Validate required fields
    if (!clerkId || !email) {
      return res.status(400).json({
        success: false,
        message: 'clerkId and email are required',
      });
    }

    // Upsert: create if not exists, update if exists
    const user = await User.findOneAndUpdate(
      { clerkId },
      {
        clerkId,
        email: email.toLowerCase(),
        firstName: firstName || '',
        lastName: lastName || '',
        profileImage: profileImage || '',
      },
      {
        new: true, // Return updated document
        upsert: true, // Create if not found
        runValidators: true,
      }
    );

    res.status(200).json({
      success: true,
      message: 'User synced successfully',
      data: user,
    });
  } catch (error) {
    console.error('User sync error:', error);

    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'User with this clerkId or email already exists',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to sync user',
      error: error.message,
    });
  }
};

/**
 * GET /api/users/profile
 * Get current authenticated user's profile.
 * Uses req.userId set by the auth middleware.
 */
export const getProfile = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    const user = await User.findOne({ clerkId: userId });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found. Please complete sign-up.',
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile',
      error: error.message,
    });
  }
};

/**
 * PUT /api/users/profile
 * Update current authenticated user's profile.
 * Allows updating firstName, lastName, profileImage, and plan.
 */
export const updateProfile = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    const { firstName, lastName, profileImage, plan } = req.body;

    // Build update object with only provided fields
    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (profileImage !== undefined) updateData.profileImage = profileImage;
    if (plan !== undefined) {
      if (!['free', 'pro'].includes(plan)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid plan. Must be "free" or "pro".',
        });
      }
      updateData.plan = plan;
    }

    const user = await User.findOneAndUpdate(
      { clerkId: userId },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message,
    });
  }
};
