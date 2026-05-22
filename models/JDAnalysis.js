/**
 * JDAnalysis Model
 * Stores AI-generated analysis of job descriptions,
 * including extracted skills, match percentage, and recommendations.
 */

import mongoose from 'mongoose';

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

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for efficient listing by user
jdAnalysisSchema.index({ userId: 1, createdAt: -1 });

const JDAnalysis = mongoose.model('JDAnalysis', jdAnalysisSchema);

export default JDAnalysis;
