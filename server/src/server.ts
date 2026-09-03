import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import https from 'https';
import http from 'http';
import { connectDB } from './config/db';
import User from './models/User';
import authRoutes from './routes/authRoutes';
import complaintRoutes from './routes/complaintRoutes';
import adminRoutes from './routes/adminRoutes';

dotenv.config();

const app = express();

// Connect to MongoDB
connectDB();

// Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Root health check endpoint (Lightweight keep-alive ping)
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'online',
    service: 'CivicLens API (TypeScript)',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Seed default Super Admin account if none exists
const seedSuperAdmin = async (): Promise<void> => {
  try {
    const superAdmin = await User.findOne({ role: 'superadmin' });
    if (!superAdmin) {
      await User.create({
        name: 'State Central Admin',
        email: 'superadmin@civiclens.gov.in',
        password: 'SuperAdmin@2026',
        role: 'superadmin',
        phone: '1800112233',
        department: 'Governance & Public Grievances',
        assignedDistrict: 'Statewide',
        officialId: 'SUPER-001',
        isEmailVerified: true,
      });
      console.log('[Seed] Default Super Admin created: superadmin@civiclens.gov.in / SuperAdmin@2026');
    }
  } catch (err) {
    console.error('[Seed] Super Admin error:', (err as Error).message);
  }
};
seedSuperAdmin();

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/admin', adminRoutes);

// Global Error Handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Global Error]:', err.stack || err.message);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`[CivicLens TS Server] Running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);

  // Self-Ping Heartbeat: Keep Render 24/7 awake by pinging itself every 10 minutes
  const backendUrl = process.env.RENDER_EXTERNAL_URL || 'https://civiclens-ez72.onrender.com';
  if (backendUrl.startsWith('https://')) {
    console.log(`[Keep-Alive] 24/7 Self-ping enabled for: ${backendUrl}/api/health`);
    setInterval(() => {
      https.get(`${backendUrl}/api/health`, (res) => {
        console.log(`[Keep-Alive Ping] Heartbeat sent to Render. Status: ${res.statusCode}`);
      }).on('error', (e) => {
        console.warn(`[Keep-Alive Ping Warning]: ${e.message}`);
      });
    }, 10 * 60 * 1000); // Every 10 minutes (before Render's 15 min sleep limit)
  }
});
