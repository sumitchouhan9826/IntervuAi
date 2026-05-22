/**
 * JD Matcher Service
 * Analyzes job descriptions using AI and optionally compares
 * them against a candidate's resume skills.
 */

import { chatCompletion } from './groq.service.js';
import { getJDAnalysisPrompt } from './aiPrompts.js';

/**
 * Analyze a job description and optionally match against resume skills.
 *
 * @param {string} jobDescription - Raw job description text
 * @param {string[]} [resumeSkills=[]] - Skills from the user's resume for matching
 * @returns {Promise<Object>} JD analysis result
 * @returns {string} result.jobTitle - Extracted job title
 * @returns {string} result.company - Extracted company name
 * @returns {string[]} result.extractedSkills - All skills found in the JD
 * @returns {string} result.requiredExperience - Experience requirement
 * @returns {number|null} result.matchPercentage - Resume match percentage (null if no resume)
 * @returns {string[]} result.missingSkills - Skills the candidate lacks
 * @returns {string[]} result.recommendations - Actionable recommendations
 */
export async function analyzeJobDescription(jobDescription, resumeSkills = []) {
  if (!jobDescription || jobDescription.trim().length < 20) {
    throw new Error('Job description is too short for meaningful analysis');
  }

  const { system, user } = getJDAnalysisPrompt(jobDescription, resumeSkills);

  const result = await chatCompletion(system, user, {
    temperature: 0.5,
    maxTokens: 4096,
  });

  // Validate and normalize response
  return {
    jobTitle: result.jobTitle || 'Not specified',
    company: result.company || 'Not specified',
    extractedSkills: Array.isArray(result.extractedSkills) ? result.extractedSkills : [],
    requiredExperience: result.requiredExperience || 'Not specified',
    matchPercentage:
      result.matchPercentage != null
        ? Math.max(0, Math.min(100, Number(result.matchPercentage)))
        : null,
    missingSkills: Array.isArray(result.missingSkills) ? result.missingSkills : [],
    recommendations: Array.isArray(result.recommendations) ? result.recommendations : [],
  };
}
