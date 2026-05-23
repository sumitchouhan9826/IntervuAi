/**
 * ResumeAnalysis Model
 * Handles resume parsing, extracted text/skills, ATS scoring, and resume-based mock interview sessions.
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

const resumeAnalysisSchema = new mongoose.Schema({
  // Owner — Clerk user ID
  userId: {
    type: String,
    required: [true, 'User ID is required'],
    index: true,
  },

  // Original file metadata
  fileName: {
    type: String,
    default: '',
  },

  // Extracted/parsed texts
  extractedText: {
    type: String,
    default: '',
  },
  parsedText: {
    type: String,
    default: '',
  },

  // Extracted skills
  extractedSkills: {
    type: [String],
    default: [],
  },
  skills: {
    type: [String],
    default: [],
  },

  // Resume analysis metrics
  atsScore: {
    type: Number,
    min: 0,
    max: 100,
    default: null,
  },

  strengths: {
    type: [String],
    default: [],
  },

  weaknesses: {
    type: [String],
    default: [],
  },

  missingSkills: {
    type: [String],
    default: [],
  },

  suggestions: {
    type: [String],
    default: [],
  },

  difficultyLevel: {
    type: String,
    default: '',
  },

  technicalQuestions: {
    type: [String],
    default: [],
  },

  hrQuestions: {
    type: [String],
    default: [],
  },

  // Resume-based interview sessions
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
resumeAnalysisSchema.index({ userId: 1, createdAt: -1 });

const ResumeAnalysis = mongoose.model('ResumeAnalysis', resumeAnalysisSchema);

export default ResumeAnalysis;
