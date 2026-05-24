import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { clerkMiddleware } from '@clerk/express';
import connectDB  from './config/db.js';
import { standardLimiter } from './middleware/rateLimiter.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';
import userRoutes from './routes/user.routes.js';
import interviewRoutes from './routes/interview.routes.js';
import resumeRoutes from './routes/resume.routes.js';
import jdRoutes from './routes/jd.routes.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000" || "http://localhost:3001",
  credentials: true,
}));

// Rate limiting
app.use('/api/', standardLimiter);

// Body parsing
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Clerk authentication middleware
app.use(clerkMiddleware());

// Routes
// Versioned APIs (v1)
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/interviews', interviewRoutes);
app.use('/api/v1/resume', resumeRoutes);
app.use('/api/v1/jd', jdRoutes);

// Legacy APIs (for backwards compatibility)
app.use('/api/users', userRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/jd', jdRoutes);

// Health check
app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 IntervuAI server running on port ${PORT}`);
});

export default app;
