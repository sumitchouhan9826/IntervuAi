/**
 * Feedback Engine Service
 * Utility functions for calculating scores and generating
 * session summaries from completed interview data.
 */

/**
 * Calculate a weighted overall score from individual question scores.
 * Weights harder questions more heavily.
 *
 * @param {Array<Object>} questionScores - Array of { score, difficulty } objects
 * @returns {number} Weighted average score (0–100)
 */
export function calculateOverallScore(questionScores) {
  if (!questionScores || questionScores.length === 0) return 0;

  // Difficulty weight multipliers
  const weightMap = {
    easy: 1.0,
    medium: 1.5,
    hard: 2.0,
  };

  let totalWeightedScore = 0;
  let totalWeight = 0;
  let scoredCount = 0;

  for (const item of questionScores) {
    const score = item.score;
    if (score == null) continue; // Skip unscored questions

    const weight = weightMap[item.difficulty] || 1.0;
    totalWeightedScore += score * weight;
    totalWeight += weight;
    scoredCount++;
  }

  if (scoredCount === 0) return 0;

  return Math.round(totalWeightedScore / totalWeight);
}

/**
 * Generate a session summary with statistics for a completed interview.
 *
 * @param {Object} interview - The completed interview document
 * @returns {Object} Session summary with various statistics
 */
export function generateSessionSummary(interview) {
  const { questions, overallScore, overallFeedback, duration, jobRole, type } = interview;

  // Count answered questions
  const totalQuestions = questions.length;
  const answeredQuestions = questions.filter((q) => q.answer && q.answer.trim() !== '').length;
  const scoredQuestions = questions.filter((q) => q.score != null).length;

  // Calculate score statistics
  const scores = questions
    .filter((q) => q.score != null)
    .map((q) => q.score);

  const averageScore =
    scores.length > 0
      ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
      : 0;

  const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
  const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;

  // Categorize questions by difficulty
  const difficultyBreakdown = {
    easy: questions.filter((q) => q.difficulty === 'easy').length,
    medium: questions.filter((q) => q.difficulty === 'medium').length,
    hard: questions.filter((q) => q.difficulty === 'hard').length,
  };

  // Categorize questions by type
  const typeBreakdown = {};
  for (const q of questions) {
    const qType = q.type || 'other';
    typeBreakdown[qType] = (typeBreakdown[qType] || 0) + 1;
  }

  // Identify strongest and weakest areas
  const typeScores = {};
  for (const q of questions) {
    if (q.score == null) continue;
    const qType = q.type || 'other';
    if (!typeScores[qType]) {
      typeScores[qType] = { total: 0, count: 0 };
    }
    typeScores[qType].total += q.score;
    typeScores[qType].count += 1;
  }

  const areaAverages = Object.entries(typeScores).map(([area, data]) => ({
    area,
    averageScore: Math.round(data.total / data.count),
  }));

  areaAverages.sort((a, b) => b.averageScore - a.averageScore);

  return {
    jobRole: jobRole || 'N/A',
    interviewType: type,
    totalQuestions,
    answeredQuestions,
    scoredQuestions,
    averageScore,
    overallScore: overallScore || averageScore,
    highestScore,
    lowestScore,
    duration: duration || 0,
    difficultyBreakdown,
    typeBreakdown,
    strongestArea: areaAverages.length > 0 ? areaAverages[0] : null,
    weakestArea: areaAverages.length > 0 ? areaAverages[areaAverages.length - 1] : null,
    overallFeedback: overallFeedback || '',
    completionRate:
      totalQuestions > 0
        ? Math.round((answeredQuestions / totalQuestions) * 100)
        : 0,
  };
}
