/**
 * Interview Controller
 * Handles interview session lifecycle: generation, answer submission,
 * completion, listing, stats, and deletion.
 */

import Interview from '../models/Interview.js';
import { getAuth } from '@clerk/express';
import RecentActivity from '../models/RecentActivity.js';
import AIFeedback from '../models/AIFeedback.js';
import ResumeAnalysis from '../models/ResumeAnalysis.js';
import JDAnalysis from '../models/JDAnalysis.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import cacheService from '../services/cache.service.js';
import {
  generateQuestions,
  evaluateAnswer,
  generateOverallFeedback,
} from '../services/interviewGenerator.js';
import {
  calculateOverallScore,
  generateSessionSummary,
} from '../services/feedbackEngine.js';

/**
 * Helper to find a session across Interview, ResumeAnalysis, and JDAnalysis collections.
 * @param {string} id - Document ID
 * @param {string} userId - User ID for ownership check
 * @returns {Promise<{ doc: Object, type: string }|null>}
 */
const findSession = async (id, userId) => {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    console.log('[findSession] Invalid or missing ObjectId format:', id);
    return null;
  }
  
  console.log('[findSession] Looking up session ID:', id, 'for user:', userId);
  
  // 1. Check Interview (Role-based)
  let doc = await Interview.findOne({ _id: id, userId });
  if (doc) {
    console.log('[findSession] Found session in Interview (role-based) collection');
    return { doc, type: 'role' };
  }

  // 2. Check ResumeAnalysis
  doc = await ResumeAnalysis.findOne({ _id: id, userId });
  if (doc) {
    console.log('[findSession] Found session in ResumeAnalysis collection');
    return { doc, type: 'resume' };
  }

  // 3. Check JDAnalysis
  doc = await JDAnalysis.findOne({ _id: id, userId });
  if (doc) {
    console.log('[findSession] Found session in JDAnalysis collection');
    return { doc, type: 'jd' };
  }

  console.log('[findSession] Session not found in any collection');
  return null;
};

/**
 * POST /api/interviews/generate
 * Generate a new interview session with AI-generated questions.
 * Accepts: { type, jobRole, experience, count, resumeText, jdText }
 */
export const generateInterview = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    const { type, jobRole, experience, count, resumeText, jdText } = req.body;

    // Validate required fields
    if (!type || !jobRole) {
      return res.status(400).json({
        success: false,
        message: 'type and jobRole are required',
      });
    }

    if (!['role', 'resume', 'jd'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'type must be one of: role, resume, jd',
      });
    }

    const experienceYears = Number(experience) || 0;
    const questionCount = Math.min(Math.max(Number(count) || 5, 1), 15); // Clamp 1-15
    const contextText = type === 'resume' ? resumeText : type === 'jd' ? jdText : '';

    // Generate questions using AI with randomized seed
    const seed = `${Date.now()}_${Math.random()}`;
    const questions = await generateQuestions(
      jobRole,
      experienceYears,
      type,
      questionCount,
      contextText,
      seed
    );

    let session = null;

    if (type === 'role') {
      // 1. Create role-based generic mock interview session
      session = await Interview.create({
        userId,
        role: jobRole,
        jobRole,
        experienceLevel: experienceYears,
        experience: experienceYears,
        interviewType: 'role',
        generatedQuestions: questions.map((q) => ({
          question: q.question,
          type: q.type,
          difficulty: q.difficulty,
          explanation: q.explanation,
        })),
        questions: questions.map((q) => ({
          question: q.question,
          type: q.type,
          difficulty: q.difficulty,
          explanation: q.explanation,
        })),
        status: 'in-progress',
      });

      // Increment MongoDB User practice counts
      await User.findOneAndUpdate({ clerkId: userId }, { $inc: { totalInterviews: 1 } }, { upsert: true });

    } else if (type === 'resume') {
      // 2. Create resume-based mock interview session
      session = await ResumeAnalysis.create({
        userId,
        fileName: 'resume_interview.pdf',
        extractedText: resumeText || '',
        parsedText: resumeText || '',
        extractedSkills: [],
        skills: [],
        atsScore: 70, // Baseline mock session ATS estimation
        generatedQuestions: questions.map((q) => ({
          question: q.question,
          type: q.type,
          difficulty: q.difficulty,
          explanation: q.explanation,
        })),
        questions: questions.map((q) => ({
          question: q.question,
          type: q.type,
          difficulty: q.difficulty,
          explanation: q.explanation,
        })),
        status: 'in-progress',
      });

      // Increment MongoDB User resume analysis counts
      await User.findOneAndUpdate({ clerkId: userId }, { $inc: { totalResumeAnalyses: 1 } }, { upsert: true });

    } else if (type === 'jd') {
      // 3. Create Job Description-based mock interview session
      session = await JDAnalysis.create({
        userId,
        jobTitle: jobRole,
        company: 'Custom Match',
        jobDescription: jdText || '',
        extractedSkills: [],
        generatedQuestions: questions.map((q) => ({
          question: q.question,
          type: q.type,
          difficulty: q.difficulty,
          explanation: q.explanation,
        })),
        questions: questions.map((q) => ({
          question: q.question,
          type: q.type,
          difficulty: q.difficulty,
          explanation: q.explanation,
        })),
        status: 'in-progress',
      });

      // Increment MongoDB User JD match counts
      await User.findOneAndUpdate({ clerkId: userId }, { $inc: { totalJDAnalyses: 1 } }, { upsert: true });
    }

    // Log RecentActivity
    try {
      await RecentActivity.create({
        userId,
        title: `${jobRole} Mock Interview Started (${type}-based)`,
        type,
        referenceId: session._id,
        duration: '0 min',
      });
    } catch (activityError) {
      console.error('Failed to log RecentActivity for generateInterview:', activityError);
    }

    // Invalidate cached lists, stats, and activity
    try {
      cacheService.delete(`stats_${userId}`);
      cacheService.clearPattern(`^list_${userId}_`);
      cacheService.delete(`activity_${userId}`);
      console.log(`[Cache] Invalidated statistics, history lists, and activity for user: ${userId}`);
    } catch (cacheError) {
      console.error('Failed to invalidate cache:', cacheError);
    }

    res.status(201).json({
      success: true,
      message: 'Interview generated successfully',
      data: session,
    });
  } catch (error) {
    console.error('Generate interview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate interview',
      error: error.message,
    });
  }
};

/**
 * POST /api/interviews/:id/answer
 * Submit an answer for a specific question in the interview.
 * Accepts: { questionIndex, answer }
 */
export const submitAnswer = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    const { id } = req.params;
    const { questionIndex, answer } = req.body;

    // Validate input
    if (questionIndex === undefined || questionIndex === null) {
      return res.status(400).json({
        success: false,
        message: 'questionIndex is required',
      });
    }

    if (!answer || answer.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'answer is required and cannot be empty',
      });
    }

    // Find the session across all collections
    const lookup = await findSession(id, userId);

    if (!lookup) {
      return res.status(404).json({
        success: false,
        message: 'Mock session not found',
      });
    }

    const { doc: session, type: sessionType } = lookup;

    if (session.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot submit answers to a completed mock session',
      });
    }

    // Resolve questions array dynamically
    const questionsArray = session.generatedQuestions?.length > 0 ? session.generatedQuestions : session.questions;

    // Validate question index
    const idx = Number(questionIndex);
    if (idx < 0 || idx >= questionsArray.length) {
      return res.status(400).json({
        success: false,
        message: `Invalid questionIndex. Must be between 0 and ${questionsArray.length - 1}`,
      });
    }

    const roleName = session.role || session.jobRole || 'Software Engineer';

    // Evaluate the answer using AI
    const evaluation = await evaluateAnswer(
      questionsArray[idx].question,
      answer,
      roleName
    );

    // Update the question with answer and feedback
    questionsArray[idx].answer = answer;
    questionsArray[idx].feedback = evaluation.feedback;
    questionsArray[idx].score = evaluation.score;
    questionsArray[idx].strengths = evaluation.strengths || [];
    questionsArray[idx].improvements = evaluation.improvements || [];

    // Update status to in-progress if it was pending
    if (session.status === 'pending') {
      session.status = 'in-progress';
    }

    await session.save();

    res.status(200).json({
      success: true,
      message: 'Answer submitted and evaluated',
      data: {
        questionIndex: idx,
        score: evaluation.score,
        feedback: evaluation.feedback,
        strengths: evaluation.strengths,
        improvements: evaluation.improvements,
        idealAnswer: evaluation.idealAnswer,
      },
    });
  } catch (error) {
    console.error('Submit answer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit answer',
      error: error.message,
    });
  }
};

/**
 * POST /api/interviews/:id/complete
 * Mark an interview as completed and generate overall feedback.
 */
export const completeInterview = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    const { id } = req.params;

    const lookup = await findSession(id, userId);
    if (!lookup) {
      return res.status(404).json({
        success: false,
        message: 'Mock session not found',
      });
    }

    const { doc: session, type: sessionType } = lookup;

    if (session.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Session is already completed',
      });
    }

    const questionsArray = session.generatedQuestions?.length > 0 ? session.generatedQuestions : session.questions;
    const roleName = session.role || session.jobRole || 'Software Engineer';

    // Generate overall feedback using AI
    const overallResult = await generateOverallFeedback({
      questions: questionsArray,
      jobRole: roleName,
    });

    const questionScoreData = questionsArray.map((q) => ({
      score: q.score,
      difficulty: q.difficulty,
    }));
    const calculatedScore = calculateOverallScore(questionScoreData);

    const finalScore = overallResult.overallScore || calculatedScore;

    // Set overall score and feedback on both aliases to prevent model differences
    session.score = finalScore;
    session.overallScore = finalScore;
    
    session.aiFeedback = overallResult.overallFeedback;
    session.overallFeedback = overallResult.overallFeedback;
    session.aiAnalysis = overallResult.overallFeedback; // For Resume/JD analysis text field

    session.status = 'completed';

    const durationMs = Date.now() - new Date(session.createdAt).getTime();
    session.duration = Math.round(durationMs / 60000);

    await session.save();

    // 1. Save detailed feedback in AIFeedback collection
    try {
      await AIFeedback.create({
        userId,
        interviewId: session._id,
        overallScore: finalScore,
        overallFeedback: session.overallFeedback,
        topStrengths: overallResult.topStrengths || [],
        areasForImprovement: overallResult.areasForImprovement || [],
        studyRecommendations: overallResult.studyRecommendations || [],
        readinessLevel: overallResult.readinessLevel || 'needs-preparation',
      });
    } catch (feedbackSaveError) {
      console.error('Failed to save AIFeedback doc:', feedbackSaveError);
    }

    // 2. Create RecentActivity entry for completion
    try {
      await RecentActivity.create({
        userId,
        title: `${roleName} Mock Interview Completed — Score: ${finalScore}%`,
        type: sessionType,
        referenceId: session._id,
        score: finalScore,
        duration: `${session.duration} min`,
      });
    } catch (activityError) {
      console.error('Failed to log RecentActivity for completeInterview:', activityError);
    }

    const summary = generateSessionSummary(session);

    // Invalidate cached lists, stats, and activity
    try {
      cacheService.delete(`stats_${userId}`);
      cacheService.clearPattern(`^list_${userId}_`);
      cacheService.delete(`activity_${userId}`);
      console.log(`[Cache] Invalidated statistics, history lists, and activity for user: ${userId}`);
    } catch (cacheError) {
      console.error('Failed to invalidate cache:', cacheError);
    }

    res.status(200).json({
      success: true,
      message: 'Mock session completed successfully',
      data: {
        interview: session,
        summary,
        aiInsights: {
          topStrengths: overallResult.topStrengths,
          areasForImprovement: overallResult.areasForImprovement,
          studyRecommendations: overallResult.studyRecommendations,
          readinessLevel: overallResult.readinessLevel,
        },
      },
    });
  } catch (error) {
    console.error('Complete mock session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete mock session',
      error: error.message,
    });
  }
};

/**
 * GET /api/interviews
 * List user's interviews with pagination and filtering across Interview, ResumeAnalysis, and JDAnalysis.
 * Query params: page, limit, type, sort (e.g., '-createdAt')
 */
export const listInterviews = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    const { page = 1, limit = 10, type, status, sort = '-createdAt' } = req.query;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));
    
    const cacheKey = `list_${userId}_page_${pageNum}_limit_${limitNum}_type_${type || 'all'}_status_${status || 'all'}_sort_${sort}`;

    // Try cache hit
    const cachedData = cacheService.get(cacheKey);
    if (cachedData) {
      return res.status(200).json({
        success: true,
        data: cachedData.paginated,
        pagination: cachedData.pagination
      });
    }

    // Fetch lists from the targeted or all collections with lean() and select() optimizations
    let roles = [];
    let resumes = [];
    let jds = [];

    if (!type || type === 'role') {
      const filter = { userId };
      if (status) filter.status = status;
      roles = await Interview.find(filter).select('-generatedQuestions -questions').lean();
    }

    if (!type || type === 'resume') {
      const filter = { userId };
      if (status) filter.status = status;
      // Fetch only resume analyses that are initialized with mock questions
      filter.generatedQuestions = { $exists: true, $ne: [] };
      resumes = await ResumeAnalysis.find(filter).select('-generatedQuestions -questions -extractedText -parsedText').lean();
    }

    if (!type || type === 'jd') {
      const filter = { userId };
      if (status) filter.status = status;
      // Fetch only JD analyses that are initialized with mock questions
      filter.generatedQuestions = { $exists: true, $ne: [] };
      jds = await JDAnalysis.find(filter).select('-generatedQuestions -questions -jobDescription').lean();
    }

    // Unify lists dynamically
    const unified = [
      ...roles.map(r => ({
        _id: r._id,
        title: r.title || r.role || `${r.jobRole || 'Software'} Mock Interview`,
        type: 'role',
        overallScore: r.overallScore !== null && r.overallScore !== undefined ? r.overallScore : r.score,
        duration: r.duration,
        status: r.status,
        createdAt: r.createdAt
      })),
      ...resumes.map(r => ({
        _id: r._id,
        title: r.fileName || 'Resume Mock Session',
        type: 'resume',
        overallScore: r.overallScore,
        duration: r.duration,
        status: r.status,
        createdAt: r.createdAt
      })),
      ...jds.map(r => ({
        _id: r._id,
        title: r.jobTitle ? `${r.jobTitle} at ${r.company || 'Company'} Match` : 'JD Mock Session',
        type: 'jd',
        overallScore: r.overallScore,
        duration: r.duration,
        status: r.status,
        createdAt: r.createdAt
      }))
    ];

    // Sort unified list
    const isSortAsc = sort.startsWith('-') ? -1 : 1;
    const sortField = sort.replace(/^-/, '');
    
    unified.sort((a, b) => {
      if (sortField === 'overallScore') {
        const scoreA = a.overallScore || 0;
        const scoreB = b.overallScore || 0;
        return (scoreA - scoreB) * isSortAsc;
      }
      const valA = new Date(a[sortField]);
      const valB = new Date(b[sortField]);
      return (valA - valB) * isSortAsc;
    });

    const total = unified.length;
    const paginated = unified.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    const paginationResult = {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    };

    // Cache the result for 5 minutes (300 seconds)
    cacheService.set(cacheKey, { paginated, pagination: paginationResult }, 300);

    res.status(200).json({
      success: true,
      data: paginated,
      pagination: paginationResult,
    });
  } catch (error) {
    console.error('List interviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve interviews',
      error: error.message,
    });
  }
};

/**
 * GET /api/interviews/stats
 * Get user's dynamic interview statistics across Interview, ResumeAnalysis, and JDAnalysis.
 */
export const getStats = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    const cacheKey = `stats_${userId}`;

    // Try cache hit
    const cachedData = cacheService.get(cacheKey);
    if (cachedData) {
      return res.status(200).json({
        success: true,
        data: cachedData
      });
    }

    // Fetch from all three collections in parallel with lean() and select() optimizations
    const [roles, resumes, jds] = await Promise.all([
      Interview.find({ userId }).select('overallScore score duration status createdAt').lean(),
      ResumeAnalysis.find({ userId, generatedQuestions: { $exists: true, $ne: [] } }).select('overallScore duration status createdAt').lean(),
      JDAnalysis.find({ userId, generatedQuestions: { $exists: true, $ne: [] } }).select('overallScore duration status createdAt').lean()
    ]);

    const unified = [
      ...roles.map(r => ({ score: r.overallScore !== null && r.overallScore !== undefined ? r.overallScore : r.score, duration: r.duration, status: r.status, createdAt: r.createdAt })),
      ...resumes.map(r => ({ score: r.overallScore, duration: r.duration, status: r.status, createdAt: r.createdAt })),
      ...jds.map(r => ({ score: r.overallScore, duration: r.duration, status: r.status, createdAt: r.createdAt }))
    ];

    const completed = unified.filter(i => i.status === 'completed');

    const totalMinutes = unified.reduce((sum, i) => sum + (i.duration || 0), 0);
    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;

    const scores = completed
      .filter(i => i.score != null)
      .map(i => i.score);

    const averageScore = scores.length > 0
      ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
      : 0;

    const recentScores = completed
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10)
      .map(i => ({
        score: i.score,
        date: i.createdAt
      }));

    const statsResult = {
      totalSessions: unified.length,
      completedSessions: completed.length,
      totalHours,
      averageScore,
      recentScores
    };

    // Cache the result for 5 minutes (300 seconds)
    cacheService.set(cacheKey, statsResult, 300);

    res.status(200).json({
      success: true,
      data: statsResult
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve statistics',
      error: error.message
    });
  }
};

/**
 * GET /api/interviews/:id
 * Get a single interview with full details (including answers and feedback) from any collection.
 */
export const getInterview = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    const { id } = req.params;

    const lookup = await findSession(id, userId);
    if (!lookup) {
      return res.status(404).json({
        success: false,
        message: 'Mock session not found',
      });
    }

    res.status(200).json({
      success: true,
      interview: lookup.doc,
      data: lookup.doc,
    });
  } catch (error) {
    console.error('Get mock session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve mock session',
      error: error.message,
    });
  }
};

/**
 * DELETE /api/interviews/:id
 * Delete a mock session by ID from any collection.
 */
export const deleteInterview = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    const { id } = req.params;

    let session = await Interview.findOneAndDelete({ _id: id, userId });
    if (!session) {
      session = await ResumeAnalysis.findOneAndDelete({ _id: id, userId });
    }
    if (!session) {
      session = await JDAnalysis.findOneAndDelete({ _id: id, userId });
    }

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Mock session not found',
      });
    }

    // Invalidate cached lists, stats, and activity
    try {
      cacheService.delete(`stats_${userId}`);
      cacheService.clearPattern(`^list_${userId}_`);
      cacheService.delete(`activity_${userId}`);
      console.log(`[Cache] Invalidated statistics, history lists, and activity for user: ${userId}`);
    } catch (cacheError) {
      console.error('Failed to invalidate cache:', cacheError);
    }

    res.status(200).json({
      success: true,
      message: 'Mock session deleted successfully',
    });
  } catch (error) {
    console.error('Delete mock session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete mock session',
      error: error.message,
    });
  }
};
