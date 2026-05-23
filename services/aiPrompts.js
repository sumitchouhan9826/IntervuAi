/**
 * AI Prompt Templates
 * Centralized prompt engineering for all AI interactions.
 * Each function returns { system, user } prompt pairs that instruct
 * the AI to respond in valid JSON format with specific field names.
 */

/**
 * Generate interview questions for a specific role and experience level.
 *
 * @param {string} jobRole - Target job role (e.g., "Senior React Developer")
 * @param {number} experience - Years of experience
 * @param {string} type - Interview type: 'role', 'resume', or 'jd'
 * @param {number} [count=5] - Number of questions to generate
 * @returns {{ system: string, user: string }} Prompt pair
 */
export function getInterviewQuestionsPrompt(jobRole, experience, type, count = 5, contextText = '') {
  const system = `You are an expert technical interviewer with 15+ years of experience conducting interviews at top tech companies. Your task is to generate realistic, high-quality interview questions.

You MUST respond with valid JSON in the following format:
{
  "questions": [
    {
      "question": "The interview question text",
      "type": "technical|behavioral|hr|system-design",
      "difficulty": "easy|medium|hard",
      "expectedTopics": ["topic1", "topic2"],
      "explanation": "A high-quality explanation and breakdown of what a correct/ideal answer should cover, including core concepts, solution steps, or best practices for the question."
    }
  ]
}

Guidelines:
- Generate exactly ${count} questions
- Mix question types appropriately for the role and interview type
- Scale difficulty based on experience level
- For technical roles, include coding concepts, system design, and problem-solving
- For behavioral questions, use the STAR method format
- Each question should be specific and relevant to the role
- Include expectedTopics that a strong candidate would mention
- Provide a detailed and precise explanation or ideal answer breakdown for each question in the "explanation" field`;

  let user = `Generate ${count} interview questions for the following:
- Job Role: ${jobRole}
- Experience Level: ${experience} years
- Interview Type: ${type}

${type === 'resume' ? 'Focus questions on skills and experiences typically found in resumes for this role.' : ''}
${type === 'jd' ? 'Focus questions on practical skills and scenarios relevant to job descriptions for this role.' : ''}
${type === 'role' ? 'Generate a well-rounded mix of technical, behavioral, and role-specific questions.' : ''}

Adjust difficulty: ${experience <= 2 ? 'mostly easy/medium for a junior candidate' : experience <= 5 ? 'medium/hard for a mid-level candidate' : 'mostly hard with system design for a senior candidate'}.`;

  if (contextText && contextText.trim()) {
    user += `\n\nHere is the actual context text (resume or job description details) to customize these questions specifically around:\n---\n${contextText}\n---`;
  }

  return { system, user };
}

/**
 * Generate feedback and score for a candidate's answer.
 *
 * @param {string} question - The interview question that was asked
 * @param {string} answer - The candidate's answer
 * @param {string} jobRole - The target job role for context
 * @returns {{ system: string, user: string }} Prompt pair
 */
export function getAnswerFeedbackPrompt(question, answer, jobRole) {
  const system = `You are an expert interview coach who evaluates candidate answers with constructive, actionable feedback. You provide fair but rigorous assessments.

You MUST respond with valid JSON in the following format:
{
  "score": 75,
  "feedback": "Detailed feedback explaining the score...",
  "strengths": ["What the candidate did well"],
  "improvements": ["Specific areas to improve"],
  "idealAnswer": "A brief outline of what an ideal answer would cover"
}

Scoring guidelines:
- 0-20: Completely incorrect or irrelevant answer
- 21-40: Shows basic understanding but misses key concepts
- 41-60: Adequate answer with some gaps
- 61-80: Good answer covering most key points
- 81-100: Excellent, comprehensive answer`;

  const user = `Evaluate this interview answer for a ${jobRole} position:

**Question:** ${question}

**Candidate's Answer:** ${answer}

Provide a score (0-100) and detailed feedback. Be specific about what was good and what could be improved.`;

  return { system, user };
}

/**
 * Generate a comprehensive resume analysis.
 *
 * @param {string} resumeText - Extracted text content from the resume PDF
 * @returns {{ system: string, user: string }} Prompt pair
 */
export function getResumeAnalysisPrompt(resumeText) {
  const system = `You are an expert resume reviewer and ATS (Applicant Tracking System) specialist with extensive experience in technical recruiting. Analyze resumes thoroughly and provide actionable feedback.

You MUST respond with valid JSON in the following format:
{
  "atsScore": 78,
  "strengths": ["Strength 1", "Strength 2"],
  "weaknesses": ["Weakness 1", "Weakness 2"],
  "suggestions": ["Suggestion 1", "Suggestion 2"],
  "skills": ["skill1", "skill2", "skill3"]
}

ATS Score criteria (0-100):
- Keyword optimization and relevance
- Formatting and structure (clean sections, consistent formatting)
- Quantified achievements and impact metrics
- Action verbs usage
- Appropriate length and content density
- Contact information completeness
- Professional summary quality

Extract ALL technical skills, soft skills, tools, and technologies mentioned.`;

  const user = `Analyze the following resume text and provide a comprehensive assessment:

---
${resumeText}
---

Provide:
1. An ATS compatibility score (0-100)
2. Key strengths of the resume
3. Weaknesses and areas for improvement
4. Specific, actionable suggestions to improve the resume
5. A complete list of all skills mentioned (technical, tools, frameworks, soft skills)`;

  return { system, user };
}

/**
 * Generate job description analysis with optional resume skill matching.
 *
 * @param {string} jobDescription - Raw job description text
 * @param {string[]} [resumeSkills=[]] - Skills from the user's resume for matching
 * @returns {{ system: string, user: string }} Prompt pair
 */
export function getJDAnalysisPrompt(jobDescription, resumeSkills = []) {
  const hasResume = resumeSkills.length > 0;

  const system = `You are an expert career advisor and job market analyst. Analyze job descriptions to extract key requirements and ${hasResume ? 'compare them against a candidate\'s skills' : 'provide insights for potential candidates'}.

You MUST respond with valid JSON in the following format:
{
  "jobTitle": "Extracted job title",
  "company": "Company name if mentioned",
  "extractedSkills": ["skill1", "skill2"],
  "requiredExperience": "X years in Y",
  ${hasResume ? '"matchPercentage": 72,' : '"matchPercentage": null,'}
  "missingSkills": ["skill1", "skill2"],
  "recommendations": ["Recommendation 1", "Recommendation 2"]
}

Be thorough in extracting ALL mentioned skills, technologies, and requirements.`;

  const user = `Analyze the following job description:

---
${jobDescription}
---

${hasResume ? `
The candidate has the following skills from their resume:
${resumeSkills.join(', ')}

Calculate a match percentage based on how well the candidate's skills align with the job requirements. Identify missing skills.
` : `
No resume skills provided. Set matchPercentage to null and list all required skills as potentially missing.
`}

Provide:
1. Extracted job title and company
2. All required skills and technologies
3. Experience requirements
4. ${hasResume ? 'Match percentage and missing skills' : 'All skills listed as potentially needed'}
5. Actionable recommendations for a candidate preparing for this role`;

  return { system, user };
}

/**
 * Generate overall feedback for a completed interview session.
 *
 * @param {Array} questions - Array of question objects
 * @param {Array} answers - Array of answer strings
 * @param {Array} scores - Array of score numbers
 * @returns {{ system: string, user: string }} Prompt pair
 */
export function getOverallFeedbackPrompt(questions, answers, scores) {
  const system = `You are a senior interview coach providing comprehensive session summaries. Analyze the candidate's overall performance across all questions and provide strategic advice.

You MUST respond with valid JSON in the following format:
{
  "overallScore": 72,
  "overallFeedback": "Comprehensive summary of the interview performance...",
  "topStrengths": ["Strength 1", "Strength 2"],
  "areasForImprovement": ["Area 1", "Area 2"],
  "studyRecommendations": ["Topic to study 1", "Topic to study 2"],
  "readinessLevel": "needs-preparation|getting-there|interview-ready|excellent"
}`;

  // Build Q&A summary for the prompt
  const qaSummary = questions
    .map((q, i) => {
      return `Q${i + 1}: ${q}
Answer: ${answers[i] || 'Not answered'}
Score: ${scores[i] !== null && scores[i] !== undefined ? scores[i] + '/100' : 'Not scored'}`;
    })
    .join('\n\n');

  const user = `Analyze the candidate's overall interview performance:

${qaSummary}

Average Score: ${scores.filter((s) => s != null).length > 0 ? (scores.filter((s) => s != null).reduce((a, b) => a + b, 0) / scores.filter((s) => s != null).length).toFixed(1) : 'N/A'}

Provide a comprehensive overall assessment with actionable improvement advice.`;

  return { system, user };
}
