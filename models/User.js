/**
 * User Model
 * Stores user profile data synced from Clerk authentication.
 * Tracks subscription plan and mock interview session counts across flows.
 */

import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  clerkId: {
    type: String,
    required: [true, 'Clerk ID is required'],
    unique: true,
    index: true,
  },

  name: {
    type: String,
    trim: true,
    default: '',
  },

  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
  },

  imageUrl: {
    type: String,
    default: '',
  },

  // Subscription plan
  plan: {
    type: String,
    enum: ['free', 'pro'],
    default: 'free',
  },

  // Dynamic practice tracking metrics
  totalInterviews: {
    type: Number,
    default: 0,
  },

  totalResumeAnalyses: {
    type: Number,
    default: 0,
  },

  totalJDAnalyses: {
    type: Number,
    default: 0,
  },

  lastLogin: {
    type: Date,
    default: Date.now,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const User = mongoose.model('User', userSchema);

export default User;
