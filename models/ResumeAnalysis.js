/**
 * ResumeAnalysis Model
 * Stores AI-generated analysis results for uploaded resumes,
 * including ATS score, strengths, weaknesses, and extracted skills.
 */

import mongoose from 'mongoose';

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

  fileUrl: {
    type: String,
    default: '',
  },

  // Extracted raw text from PDF
  parsedText: {
    type: String,
    default: '',
  },

  // ATS compatibility score (0–100)
  atsScore: {
    type: Number,
    min: 0,
    max: 100,
    default: null,
  },

  // Analysis results
  strengths: {
    type: [String],
    default: [],
  },

  weaknesses: {
    type: [String],
    default: [],
  },

  suggestions: {
    type: [String],
    default: [],
  },

  // Extracted technical and soft skills
  skills: {
    type: [String],
    default: [],
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
