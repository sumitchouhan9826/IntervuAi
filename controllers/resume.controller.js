import fs from 'fs';
import path from 'path';
import multer from 'multer';
import ResumeAnalysis from '../models/ResumeAnalysis.js';
import RecentActivity from '../models/RecentActivity.js';
import { analyzeResume, extractTextFromPDF } from '../services/resumeAnalyzer.js';
import { getAuth } from '@clerk/express';

// Ensure uploads/ directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for temporary disk storage with 10MB limit
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.auth?.userId || 'temp'}_${Date.now()}${ext}`);
  }
});

// PDF-only file filter
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed!'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

export const uploadMiddleware = upload.single('resume');

/**
 * Upload a resume PDF temporarily, parse text, run Groq AI analysis,
 * save only parsed/AI-generated data to MongoDB, and unlink local file.
 * POST /api/resume/upload
 */
export const uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded or file type is not PDF' });
    }

    const { userId } = getAuth(req);
    const filePath = req.file.path;

    let parsedText = '';
    let analysisResult = null;

    try {
      // 1. Read file and extract text
      const buffer = fs.readFileSync(filePath);
      parsedText = await extractTextFromPDF(buffer);

      // 2. Analyze with Groq
      analysisResult = await analyzeResume(parsedText);
    } catch (parseOrAnalyzeError) {
      console.error('[ResumeController] Error parsing or analyzing:', parseOrAnalyzeError);
      return res.status(500).json({ error: 'Failed to process resume: ' + parseOrAnalyzeError.message });
    } finally {
      // 3. Delete temporary file from uploads/
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log('[ResumeController] Temporary upload file deleted successfully:', filePath);
        }
      } catch (unlinkError) {
        console.error('[ResumeController] Failed to delete temporary file:', unlinkError);
      }
    }

    // 4. Save parsed/AI-generated data in MongoDB
    const savedAnalysis = await ResumeAnalysis.create({
      userId,
      fileName: req.file.originalname || 'resume.pdf',
      parsedText,
      atsScore: analysisResult.atsScore,
      strengths: analysisResult.strengths,
      weaknesses: analysisResult.weaknesses,
      suggestions: analysisResult.suggestions,
      skills: analysisResult.skills,
      missingSkills: analysisResult.missingSkills,
      technicalQuestions: analysisResult.technicalQuestions,
      hrQuestions: analysisResult.hrQuestions,
      difficultyLevel: analysisResult.difficultyLevel,
    });

    // 5. Create RecentActivity
    await RecentActivity.create({
      userId,
      title: `Resume Uploaded & Analyzed — ATS: ${savedAnalysis.atsScore}%`,
      type: 'resume_analysis',
      referenceId: savedAnalysis._id,
      score: savedAnalysis.atsScore,
    });

    console.log('[ResumeController] Returning structured upload analysis result');
    res.status(201).json({
      success: true,
      analysis: savedAnalysis,
    });
  } catch (error) {
    console.error('[ResumeController] Upload resume handler error:', error);
    res.status(500).json({ error: 'Failed to upload and analyze resume' });
  }
};

/**
 * Parse a resume PDF file and return the extracted text content.
 * POST /api/resume/parse
 */
export const parseResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded or file type is not PDF' });
    }

    const filePath = req.file.path;
    let text = '';

    try {
      const buffer = fs.readFileSync(filePath);
      text = await extractTextFromPDF(buffer);
    } finally {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log('[ResumeController] Temporary parse file deleted successfully:', filePath);
        }
      } catch (unlinkError) {
        console.error('[ResumeController] Failed to delete temporary file:', unlinkError);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Resume parsed successfully',
      text,
    });
  } catch (error) {
    console.error('[ResumeController] Parse resume error:', error);
    res.status(500).json({ error: 'Failed to parse resume PDF file: ' + error.message });
  }
};

/**
 * Analyze resume text using AI and persist the analysis results.
 * POST /api/resume/analyze
 */
export const analyzeResumeHandler = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    const { resumeText, fileName } = req.body;

    if (!resumeText) {
      return res.status(400).json({ error: 'No resume text provided' });
    }

    const analysisResult = await analyzeResume(resumeText);

    const savedAnalysis = await ResumeAnalysis.create({
      userId,
      fileName: fileName || 'resume.pdf',
      parsedText: resumeText,
      atsScore: analysisResult.atsScore,
      strengths: analysisResult.strengths,
      weaknesses: analysisResult.weaknesses,
      suggestions: analysisResult.suggestions,
      skills: analysisResult.skills,
      missingSkills: analysisResult.missingSkills,
      technicalQuestions: analysisResult.technicalQuestions,
      hrQuestions: analysisResult.hrQuestions,
      difficultyLevel: analysisResult.difficultyLevel,
    });

    // Create RecentActivity
    await RecentActivity.create({
      userId,
      title: `Resume Text Analyzed — ATS: ${savedAnalysis.atsScore}%`,
      type: 'resume_analysis',
      referenceId: savedAnalysis._id,
      score: savedAnalysis.atsScore,
    });

    console.log('[ResumeController] Returning structured text analysis result');
    res.status(201).json({
      success: true,
      analysis: savedAnalysis,
    });
  } catch (error) {
    console.error('[ResumeController] Analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze resume' });
  }
};

/**
 * Fetch all resume analyses for the authenticated user.
 * GET /api/resume/analyses
 */
export const getAnalyses = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    const analyses = await ResumeAnalysis.find({ userId }).sort({ createdAt: -1 });
    res.json(analyses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analyses' });
  }
};

/**
 * Fetch a single resume analysis by ID (with ownership check).
 * GET /api/resume/analyses/:id
 */
export const getAnalysis = async (req, res) => {
  try {
    const analysis = await ResumeAnalysis.findById(req.params.id);
    if (!analysis) return res.status(404).json({ error: 'Analysis not found' });
    const { userId } = getAuth(req);
    if (analysis.userId !== userId) return res.status(403).json({ error: 'Unauthorized' });
    console.log('[ResumeController] Returning structured single analysis fetch result');
    res.json({
      success: true,
      analysis,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analysis' });
  }
};
