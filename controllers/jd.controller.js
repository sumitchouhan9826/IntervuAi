import JDAnalysis from '../models/JDAnalysis.js';
import ResumeAnalysis from '../models/ResumeAnalysis.js';
import RecentActivity from '../models/RecentActivity.js';
import { analyzeJobDescription } from '../services/jdMatcher.js';
import { getAuth } from '@clerk/express';

/**
 * Analyze a job description and optionally match against a resume's skills.
 * POST /api/jd/analyze
 */
export const analyzeJD = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    const { jobDescription, resumeId } = req.body;

    if (!jobDescription) {
      return res.status(400).json({ error: 'Job description is required' });
    }

    // Optionally load skills from an existing resume analysis for matching
    let resumeSkills = [];
    if (resumeId) {
      const resume = await ResumeAnalysis.findById(resumeId);
      if (resume) resumeSkills = resume.skills || [];
    }

    const analysis = await analyzeJobDescription(jobDescription, resumeSkills);

    const savedAnalysis = await JDAnalysis.create({
      userId,
      jobDescription,
      jobTitle: analysis.jobTitle || '',
      company: analysis.company || '',
      extractedSkills: analysis.extractedSkills,
      requiredExperience: analysis.requiredExperience || '',
      matchPercentage: analysis.matchPercentage || 0,
      missingSkills: analysis.missingSkills || [],
      recommendations: analysis.recommendations || [],
    });

    // Create RecentActivity entry
    try {
      await RecentActivity.create({
        userId,
        title: `Job Description Match — ${savedAnalysis.jobTitle} at ${savedAnalysis.company || 'Tech Company'} (${savedAnalysis.matchPercentage}% Match)`,
        type: 'jd_analysis',
        referenceId: savedAnalysis._id,
        score: savedAnalysis.matchPercentage,
      });
    } catch (activityError) {
      console.error('Failed to log RecentActivity for analyzeJD:', activityError);
    }

    res.status(201).json(savedAnalysis);
  } catch (error) {
    console.error('JD analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze job description' });
  }
};

/**
 * Fetch all JD analyses for the authenticated user.
 * GET /api/jd/analyses
 */
export const getAnalyses = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    const analyses = await JDAnalysis.find({ userId }).sort({ createdAt: -1 });
    res.json(analyses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch JD analyses' });
  }
};

/**
 * Fetch a single JD analysis by ID (with ownership check).
 * GET /api/jd/analyses/:id
 */
export const getAnalysis = async (req, res) => {
  try {
    const analysis = await JDAnalysis.findById(req.params.id);
    if (!analysis) return res.status(404).json({ error: 'Analysis not found' });
    const { userId } = getAuth(req);
    if (analysis.userId !== userId) return res.status(403).json({ error: 'Unauthorized' });
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analysis' });
  }
};
