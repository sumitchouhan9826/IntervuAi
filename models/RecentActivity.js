/**
 * RecentActivity Model
 * Stores activities for mock interviews, resume analyses, and job description matches.
 * Renders on the Dashboard page dynamically.
 */

import mongoose from 'mongoose';

const recentActivitySchema = new mongoose.Schema({
  userId: {
    type: String,
    required: [true, 'User ID is required'],
    index: true,
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
  },
  type: {
    type: String,
    enum: ['role', 'resume', 'jd', 'resume_analysis', 'jd_analysis'],
    required: true,
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  score: {
    type: Number,
    default: null,
  },
  duration: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

recentActivitySchema.index({ userId: 1, createdAt: -1 });

const RecentActivity = mongoose.model('RecentActivity', recentActivitySchema);

export default RecentActivity;
