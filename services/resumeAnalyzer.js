/**
 * Resume Analyzer Service
 * Handles PDF text extraction and AI-powered resume analysis.
 */

import * as pdfParse from 'pdf-parse';
import { chatCompletion } from './groq.service.js';
import { getResumeAnalysisPrompt } from './aiPrompts.js';

const pdf = pdfParse.default;

/**
 * Extract text content from a PDF buffer.
 *
 * @param {Buffer} buffer - PDF file buffer
 * @returns {Promise<string>} Extracted text content
 * @throws {Error} If PDF parsing fails or produces no text
 */
export async function extractTextFromPDF(buffer) {
  try {
    const data = await pdf(buffer);

    if (!data.text || data.text.trim().length === 0) {
      throw new Error('No text content could be extracted from the PDF');
    }

    // Clean up extracted text
    const cleanedText = data.text
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return cleanedText;
  } catch (error) {
    if (error.message.includes('No text content')) {
      throw error;
    }

    throw new Error(`Failed to parse PDF: ${error.message}`);
  }
}

/**
 * Analyze resume text using AI to produce ATS score, strengths,
 * weaknesses, suggestions, and extracted skills.
 *
 * @param {string} resumeText - Extracted resume text content
 * @returns {Promise<Object>} Analysis result
 */
export async function analyzeResume(resumeText) {
  if (!resumeText || resumeText.trim().length < 50) {
    throw new Error('Resume text is too short for meaningful analysis');
  }

  const { system, user } = getResumeAnalysisPrompt(resumeText);

  const result = await chatCompletion(system, user, {
    temperature: 0.5,
    maxTokens: 4096,
  });

  // Validate and normalize response
  return {
    atsScore: Math.max(0, Math.min(100, Number(result.atsScore) || 0)),
    strengths: Array.isArray(result.strengths)
      ? result.strengths
      : [],
    weaknesses: Array.isArray(result.weaknesses)
      ? result.weaknesses
      : [],
    suggestions: Array.isArray(result.suggestions)
      ? result.suggestions
      : [],
    skills: Array.isArray(result.skills)
      ? result.skills
      : [],
  };
}