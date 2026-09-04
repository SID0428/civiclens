const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const https = require('https');
const connectDB = require('./config/db');
const User = require('./models/User');

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

// Root health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    service: 'CivicLens API',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Seed default Super Admin account if none exists
const seedSuperAdmin = async () => {
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
    console.error('[Seed] Super Admin error:', err.message);
  }
};
seedSuperAdmin();




// Mount Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/complaints', require('./routes/complaintRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Global Error]:', err.stack || err.message);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`[CivicLens Server] Running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);

  // Self-Ping Heartbeat: Keep Render awake
  const backendUrl = process.env.RENDER_EXTERNAL_URL || 'https://civiclens-ez72.onrender.com';
  if (backendUrl && backendUrl.startsWith('https://')) {
    console.log(`[Keep-Alive] 24/7 Self-ping enabled for: ${backendUrl}/api/health`);
    setInterval(() => {
      https.get(`${backendUrl}/api/health`, (res) => {
        console.log(`[Keep-Alive Ping] Heartbeat status: ${res.statusCode}`);
      }).on('error', (e) => {
        console.warn(`[Keep-Alive Ping Warning]: ${e.message}`);
      });
    }, 10 * 60 * 1000);
  }
});
