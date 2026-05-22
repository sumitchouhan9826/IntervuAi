import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { clerkMiddleware } from '@clerk/express';
import connectDB  from './config/db.js';
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
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

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
app.use('/api/users', userRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/jd', jdRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  console.error(err.stack);
  
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

app.listen(PORT, () => {
  console.log(`🚀 IntervuAI server running on port ${PORT}`);
});

export default app;
