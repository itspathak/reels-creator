require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const reelRoutes = require('./routes/reelRoutes');
const brandRoutes = require('./routes/brandRoutes');
const errorHandler = require('./middleware/errorMiddleware');
const pool = require('./db');

const app = express();

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ success: true, message: 'ReelForge AI API is running', data: { db: 'ok' } });
  } catch {
    res.status(500).json({ success: false, message: 'Database connection failed' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/reels', reelRoutes);
app.use('/api', brandRoutes);

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use(errorHandler);

module.exports = app;