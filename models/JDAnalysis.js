/**
 * JDAnalysis Model
 * Handles job description analysis, keyword/relevance calculations, and JD-based mock interview sessions.
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

const jdAnalysisSchema = new mongoose.Schema({
  // Owner — Clerk user ID
  userId: {
    type: String,
    required: [true, 'User ID is required'],
    index: true,
  },

  // Raw job description text
  jobDescription: {
    type: String,
    required: [true, 'Job description is required'],
  },

  // Extracted metadata
  jobTitle: {
    type: String,
    default: '',
  },

  company: {
    type: String,
    default: '',
  },

  // Skills extracted from the JD
  extractedSkills: {
    type: [String],
    default: [],
  },
  requiredSkills: {
    type: [String],
    default: [],
  },

  // Experience requirements
  requiredExperience: {
    type: String,
    default: '',
  },

  // Resume-to-JD match percentage (0–100)
  matchPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: null,
  },

  // Skills the user is missing for this role
  missingSkills: {
    type: [String],
    default: [],
  },

  // Actionable recommendations
  recommendations: {
    type: [String],
    default: [],
  },

  // JD-based mock interview sessions
  generatedQuestions: [questionSchema],
  questions: [questionSchema], // Alias for uniform controller routing

  // Mock interview aggregates
  overallScore: {
    type: Number,
    min: 0,
    max: 100,
    default: null,
  },
  overallFeedback: {
    type: String,
    default: '',
  },
  aiAnalysis: {
    type: String,
    default: '',
  },

  // Mock session metadata
  duration: {
    type: Number,
    default: 0,
  },

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

// Index for efficient listing by user
jdAnalysisSchema.index({ userId: 1, createdAt: -1 });

const JDAnalysis = mongoose.model('JDAnalysis', jdAnalysisSchema);

export default JDAnalysis;
