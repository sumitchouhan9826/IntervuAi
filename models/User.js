/**
 * User Model
 * Stores user profile data synced from Clerk authentication.
 * Tracks subscription plan and uploaded resumes.
 */

import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  // Clerk authentication identifier
  clerkId: {
    type: String,
    required: [true, 'Clerk ID is required'],
    unique: true,
    index: true,
  },

  // User email address
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
  },

  // Profile information
  firstName: {
    type: String,
    trim: true,
    default: '',
  },

  lastName: {
    type: String,
    trim: true,
    default: '',
  },

  profileImage: {
    type: String,
    default: '',
  },

  // Subscription plan
  plan: {
    type: String,
    enum: ['free', 'pro'],
    default: 'free',
  },

  // Uploaded resumes array
  resumes: [
    {
      fileName: {
        type: String,
        required: true,
      },
      fileUrl: {
        type: String,
        required: true,
      },
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Virtual for full name
userSchema.virtual('fullName').get(function () {
  return `${this.firstName || ''} ${this.lastName || ''}`.trim();
});

// Ensure virtuals are included in JSON output
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

const User = mongoose.model('User', userSchema);

export default User;
