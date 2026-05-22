/**
 * Groq AI Service
 * Handles communication with the Groq API using the LLaMA model.
 * Provides JSON and text completion methods with retry logic.
 */

import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Send a chat completion request that expects a JSON response.
 * Includes exponential backoff retry logic for transient failures.
 *
 * @param {string} systemPrompt - System-level instruction prompt
 * @param {string} userPrompt - User-level input prompt
 * @param {Object} options - Configuration options
 * @param {number} [options.temperature=0.7] - Sampling temperature (0–2)
 * @param {number} [options.maxTokens=4096] - Maximum tokens in response
 * @param {number} [options.retries=3] - Number of retry attempts
 * @returns {Promise<Object>} Parsed JSON response from the AI
 */
export async function chatCompletion(systemPrompt, userPrompt, options = {}) {
  const { temperature = 0.7, maxTokens = 4096, retries = 3 } = options;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0]?.message?.content;

      if (!content) {
        throw new Error('Empty response from Groq API');
      }

      return JSON.parse(content);
    } catch (error) {
      console.error(
        `Groq API attempt ${attempt + 1}/${retries} failed:`,
        error.message
      );

      // Don't retry on the last attempt
      if (attempt === retries - 1) {
        throw new Error(`Groq API failed after ${retries} attempts: ${error.message}`);
      }

      // Exponential backoff: 1s, 2s, 3s...
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
}

/**
 * Send a chat completion request that returns raw text (no JSON mode).
 * Includes the same exponential backoff retry logic.
 *
 * @param {string} systemPrompt - System-level instruction prompt
 * @param {string} userPrompt - User-level input prompt
 * @param {Object} options - Configuration options
 * @param {number} [options.temperature=0.7] - Sampling temperature (0–2)
 * @param {number} [options.maxTokens=4096] - Maximum tokens in response
 * @param {number} [options.retries=3] - Number of retry attempts
 * @returns {Promise<string>} Raw text response from the AI
 */
export async function chatCompletionText(systemPrompt, userPrompt, options = {}) {
  const { temperature = 0.7, maxTokens = 4096, retries = 3 } = options;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature,
        max_tokens: maxTokens,
      });

      const content = completion.choices[0]?.message?.content;

      if (!content) {
        throw new Error('Empty response from Groq API');
      }

      return content;
    } catch (error) {
      console.error(
        `Groq API text attempt ${attempt + 1}/${retries} failed:`,
        error.message
      );

      if (attempt === retries - 1) {
        throw new Error(`Groq API failed after ${retries} attempts: ${error.message}`);
      }

      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
}
