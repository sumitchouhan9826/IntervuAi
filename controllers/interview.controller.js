/**
 * Interview Controller
 * Handles interview session lifecycle: generation, answer submission,
 * completion, listing, stats, and deletion.
 */

import Interview from '../models/Interview.js';
import { getAuth } from '@clerk/express';
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
 * POST /api/interviews/generate
 * Generate a new interview session with AI-generated questions.
 * Accepts: { type, jobRole, experience, jobDescription?, resumeId? }
 */
export const generateInterview = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    const { type, jobRole, experience, count } = req.body;

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

    // Generate questions using AI
    const questions = await generateQuestions(
      jobRole,
      experienceYears,
      type,
      questionCount
    );

    // Create interview document
    const interview = await Interview.create({
      userId,
      type,
      title: `${jobRole} Interview - ${new Date().toLocaleDateString()}`,
      jobRole,
      experience: experienceYears,
      questions: questions.map((q) => ({
        question: q.question,
        type: q.type,
        difficulty: q.difficulty,
      })),
      status: 'in-progress',
    });

    res.status(201).json({
      success: true,
      message: 'Interview generated successfully',
      data: interview,
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

    // Find the interview
    const interview = await Interview.findOne({ _id: id, userId });

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: 'Interview not found',
      });
    }

    if (interview.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot submit answers to a completed interview',
      });
    }

    // Validate question index
    const idx = Number(questionIndex);
    if (idx < 0 || idx >= interview.questions.length) {
      return res.status(400).json({
        success: false,
        message: `Invalid questionIndex. Must be between 0 and ${interview.questions.length - 1}`,
      });
    }

    // Evaluate the answer using AI
    const evaluation = await evaluateAnswer(
      interview.questions[idx].question,
      answer,
      interview.jobRole
    );

    // Update the question with answer and feedback
    interview.questions[idx].answer = answer;
    interview.questions[idx].feedback = evaluation.feedback;
    interview.questions[idx].score = evaluation.score;

    // Update status to in-progress if it was pending
    if (interview.status === 'pending') {
      interview.status = 'in-progress';
    }

    await interview.save();

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

    const interview = await Interview.findOne({ _id: id, userId });

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: 'Interview not found',
      });
    }

    if (interview.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Interview is already completed',
      });
    }

    // Generate overall feedback using AI
    const overallResult = await generateOverallFeedback({
      questions: interview.questions,
      jobRole: interview.jobRole,
    });

    // Calculate weighted overall score from individual question scores
    const questionScoreData = interview.questions.map((q) => ({
      score: q.score,
      difficulty: q.difficulty,
    }));
    const calculatedScore = calculateOverallScore(questionScoreData);

    // Use AI score if available, fallback to calculated
    interview.overallScore = overallResult.overallScore || calculatedScore;
    interview.overallFeedback = overallResult.overallFeedback;
    interview.status = 'completed';

    // Calculate duration if possible (from creation to now, in minutes)
    const durationMs = Date.now() - new Date(interview.createdAt).getTime();
    interview.duration = Math.round(durationMs / 60000);

    await interview.save();

    // Generate session summary
    const summary = generateSessionSummary(interview);

    res.status(200).json({
      success: true,
      message: 'Interview completed successfully',
      data: {
        interview,
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
    console.error('Complete interview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete interview',
      error: error.message,
    });
  }
};

/**
 * GET /api/interviews
 * List user's interviews with pagination and filtering.
 * Query params: page, limit, type, sort (e.g., '-createdAt')
 */
export const listInterviews = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    const {
      page = 1,
      limit = 10,
      type,
      status,
      sort = '-createdAt',
    } = req.query;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));

    // Build filter query
    const filter = { userId };
    if (type && ['role', 'resume', 'jd'].includes(type)) {
      filter.type = type;
    }
    if (status && ['pending', 'in-progress', 'completed'].includes(status)) {
      filter.status = status;
    }

    // Execute query with pagination
    const [interviews, total] = await Promise.all([
      Interview.find(filter)
        .sort(sort)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .select('-questions.answer -questions.feedback'), // Lighter payload for list
      Interview.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: interviews,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
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
 * Get user's interview statistics: totalSessions, totalHours, averageScore, recentScores.
 */
export const getStats = async (req, res) => {
  try {
    const { userId } = getAuth(req);

    // Fetch all user interviews
    const interviews = await Interview.find({ userId }).select(
      'overallScore duration status createdAt'
    );

    const completedInterviews = interviews.filter((i) => i.status === 'completed');

    // Calculate total hours from duration (stored in minutes)
    const totalMinutes = interviews.reduce((sum, i) => sum + (i.duration || 0), 0);
    const totalHours = Math.round((totalMinutes / 60) * 10) / 10; // 1 decimal

    // Calculate average score from completed interviews
    const scores = completedInterviews
      .filter((i) => i.overallScore != null)
      .map((i) => i.overallScore);

    const averageScore =
      scores.length > 0
        ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
        : 0;

    // Get recent scores (last 10)
    const recentScores = completedInterviews
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10)
      .map((i) => ({
        score: i.overallScore,
        date: i.createdAt,
      }));

    res.status(200).json({
      success: true,
      data: {
        totalSessions: interviews.length,
        completedSessions: completedInterviews.length,
        totalHours,
        averageScore,
        recentScores,
      },
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve statistics',
      error: error.message,
    });
  }
};

/**
 * GET /api/interviews/:id
 * Get a single interview with full details (including answers and feedback).
 */
export const getInterview = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    const { id } = req.params;

    const interview = await Interview.findOne({ _id: id, userId });

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: 'Interview not found',
      });
    }

    res.status(200).json({
      success: true,
      data: interview,
    });
  } catch (error) {
    console.error('Get interview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve interview',
      error: error.message,
    });
  }
};

/**
 * DELETE /api/interviews/:id
 * Delete an interview by ID. Only the owner can delete.
 */
export const deleteInterview = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    const { id } = req.params;

    const interview = await Interview.findOneAndDelete({
      _id: id,
      userId,
    });

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: 'Interview not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Interview deleted successfully',
    });
  } catch (error) {
    console.error('Delete interview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete interview',
      error: error.message,
    });
  }
};
