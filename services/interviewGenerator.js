/**
 * Interview Generator Service
 * Orchestrates AI-powered interview question generation,
 * answer evaluation, and overall feedback generation.
 */

import { chatCompletion } from './groq.service.js';
import {
  getInterviewQuestionsPrompt,
  getAnswerFeedbackPrompt,
  getOverallFeedbackPrompt,
} from './aiPrompts.js';

/**
 * Generate interview questions for a given role and experience level.
 *
 * @param {string} jobRole - Target job role
 * @param {number} experience - Years of experience
 * @param {string} type - Interview type: 'role', 'resume', or 'jd'
 * @param {number} [count=5] - Number of questions to generate
 * @returns {Promise<Array>} Array of question objects
 */
export async function generateQuestions(jobRole, experience, type, count = 5, contextText = '', seed = '') {
  const { system, user } = getInterviewQuestionsPrompt(
    jobRole,
    experience,
    type,
    count,
    contextText,
    seed
  );

  const result = await chatCompletion(system, user, {
    temperature: 0.8, // Slightly higher for diverse questions
    maxTokens: 4096,
  });

  // Validate and normalize the response
  const questions = result.questions || result;

  if (!Array.isArray(questions)) {
    throw new Error('AI did not return a valid questions array');
  }

  return questions.map((q) => ({
    question: q.question,
    type: q.type || 'technical',
    difficulty: q.difficulty || 'medium',
    expectedTopics: q.expectedTopics || [],
    explanation: q.explanation || q.idealAnswer || '',
  }));
}

/**
 * Evaluate a candidate's answer to an interview question.
 *
 * @param {string} question - The interview question
 * @param {string} answer - The candidate's answer
 * @param {string} jobRole - Target job role for context
 * @returns {Promise<Object>} Evaluation result with score and feedback
 */
export async function evaluateAnswer(question, answer, jobRole) {
  const { system, user } = getAnswerFeedbackPrompt(question, answer, jobRole);

  const result = await chatCompletion(system, user, {
    temperature: 0.5, // Lower temperature for consistent scoring
    maxTokens: 2048,
  });

  // Validate score is within range
  const score = Math.max(0, Math.min(100, Number(result.score) || 0));

  return {
    score,
    feedback: result.feedback || 'No feedback available.',
    strengths: result.strengths || [],
    improvements: result.improvements || [],
    idealAnswer: result.idealAnswer || '',
  };
}

/**
 * Generate overall feedback for a completed interview session.
 *
 * @param {Object} interviewData - The interview document data
 * @param {Array} interviewData.questions - Array of question objects with answers and scores
 * @param {string} [interviewData.jobRole] - Target job role
 * @returns {Promise<Object>} Overall feedback with score and summary
 */
export async function generateOverallFeedback(interviewData) {
  const { questions: interviewQuestions } = interviewData;

  // Extract data arrays for the prompt
  const questionTexts = interviewQuestions.map((q) => q.question);
  const answers = interviewQuestions.map((q) => q.answer || 'Not answered');
  const scores = interviewQuestions.map((q) => q.score);

  const { system, user } = getOverallFeedbackPrompt(
    questionTexts,
    answers,
    scores
  );

  const result = await chatCompletion(system, user, {
    temperature: 0.6,
    maxTokens: 2048,
  });

  return {
    overallScore: Math.max(0, Math.min(100, Number(result.overallScore) || 0)),
    overallFeedback: result.overallFeedback || 'No overall feedback available.',
    topStrengths: result.topStrengths || [],
    areasForImprovement: result.areasForImprovement || [],
    studyRecommendations: result.studyRecommendations || [],
    readinessLevel: result.readinessLevel || 'needs-preparation',
  };
}
