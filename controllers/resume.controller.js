import multer from 'multer';
import ResumeAnalysis from '../models/ResumeAnalysis.js';
import User from '../models/User.js';
import { uploadToCloudinary } from '../config/cloudinary.js';
import { analyzeResume, extractTextFromPDF } from '../services/resumeAnalyzer.js';
import { getAuth } from '@clerk/express';

// Configure multer for in-memory file storage with 10MB limit
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

export const uploadMiddleware = upload.single('resume');

/**
 * Upload a resume file to Cloudinary and save reference to user profile.
 * POST /api/resume/upload
 */
export const uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { userId } = getAuth(req);
    
    // Upload to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, {
      folder: 'intervuai/resumes',
      resource_type: 'raw',
      public_id: `${userId}_${Date.now()}`,
    });

    // Save to user's resumes
    await User.findOneAndUpdate(
      { clerkId: userId },
      { $push: { resumes: { fileName: req.file.originalname, fileUrl: result.secure_url, uploadedAt: new Date() } } },
      { upsert: true }
    );

    res.status(201).json({
      message: 'Resume uploaded successfully',
      resume: { fileName: req.file.originalname, fileUrl: result.secure_url },
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload resume' });
  }
};

/**
 * Analyze resume text using AI and persist the analysis results.
 * POST /api/resume/analyze
 */
export const analyzeResumeHandler = async (req, res) => {
  try {
    const { userId } = getAuth(req);
    const { resumeText, fileName, fileUrl } = req.body;

    let textToAnalyze = resumeText;

    // If no text provided but a file was uploaded, extract text from PDF
    if (!textToAnalyze && req.file) {
      textToAnalyze = await extractTextFromPDF(req.file.buffer);
    }

    if (!textToAnalyze) {
      return res.status(400).json({ error: 'No resume text provided' });
    }

    const analysis = await analyzeResume(textToAnalyze);

    const savedAnalysis = await ResumeAnalysis.create({
      userId,
      fileName: fileName || 'resume.pdf',
      fileUrl: fileUrl || '',
      parsedText: textToAnalyze,
      atsScore: analysis.atsScore,
      strengths: analysis.strengths,
      weaknesses: analysis.weaknesses,
      suggestions: analysis.suggestions,
      skills: analysis.skills,
    });

    res.status(201).json(savedAnalysis);
  } catch (error) {
    console.error('Analysis error:', error);
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
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analysis' });
  }
};
