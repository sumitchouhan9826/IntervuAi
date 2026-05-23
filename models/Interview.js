/**
 * Interview Model
 * Stores mock interview sessions for ROLE-BASED mock interviews ONLY.
 */

import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      default: 'technical',
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    answer: {
      type: String,
      default: '',
    },
    feedback: {
      type: String,
      default: '',
    },
    score: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    explanation: {
      type: String,
      default: '',
    },
    strengths: {
      type: [String],
      default: [],
    },
    improvements: {
      type: [String],
      default: [],
    },
  },
  { _id: true }
);

const interviewSchema = new mongoose.Schema({
  // Owner — Clerk user ID
  userId: {
    type: String,
    required: [true, 'User ID is required'],
    index: true,
  },

  // Target job role
  role: {
    type: String,
    default: '',
  },
  jobRole: {
    type: String,
    default: '',
  },

  // Years of experience
  experienceLevel: {
    type: Number,
    min: 0,
    default: 0,
  },
  experience: {
    type: Number,
    min: 0,
    default: 0,
  },

  interviewType: {
    type: String,
    default: 'role',
  },

  // Array of interview questions with answers and feedback
  generatedQuestions: [questionSchema],
  questions: [questionSchema],

  // Aggregate scoring
  score: {
    type: Number,
    min: 0,
    max: 100,
    default: null,
  },
  overallScore: {
    type: Number,
    min: 0,
    max: 100,
    default: null,
  },

  aiFeedback: {
    type: String,
    default: '',
  },
  overallFeedback: {
    type: String,
    default: '',
  },

  // Session duration in minutes
  duration: {
    type: Number,
    default: 0,
  },

  // Session status
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed'],
    default: 'pending',
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

interviewSchema.index({ userId: 1, status: 1 });
interviewSchema.index({ userId: 1, createdAt: -1 });

const Interview = mongoose.model('Interview', interviewSchema);

export default Interview;
