require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const pool = require('./config/database');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');
const { success, failure } = require('./utils/response');
const authRoutes = require('./routes/auth.routes');
const publicRoutes = require('./routes/public.routes');
const customerRoutes = require('./routes/customer.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();
const configuredOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable('x-powered-by');
app.use(requestLogger);
app.use(cors({
  origin(origin, callback) {
    if (!origin || configuredOrigins.includes(origin) || (process.env.NODE_ENV !== 'production' && !configuredOrigins.length)) {
      return callback(null, true);
    }
    return callback(new Error('Origin is not allowed by CORS'));
  }
}));
app.use(express.json({ limit: '1mb' }));

const publicStorage = path.resolve(__dirname, 'storage/public');
const uploadsStorage = path.resolve(__dirname, 'uploads');
const publicMediaOptions = {
  fallthrough: true,
  dotfiles: 'deny',
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
  setHeaders(res) {
    res.setHeader('Cache-Control', process.env.NODE_ENV === 'production' ? 'public, max-age=86400' : 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
};

// These routes intentionally do not use auth: website media is public by design.
app.use('/api/v1/public/media', express.static(publicStorage, publicMediaOptions));
app.use('/api/v1/public/media', express.static(uploadsStorage, publicMediaOptions));
app.use('/uploads', express.static(uploadsStorage, publicMediaOptions));

app.get('/health', (req, res) => success(res, { status: 'ok' }, 'Service is healthy'));
app.get('/ready', async (req, res, next) => {
  try {
    await pool.execute('SELECT 1');
    return success(res, { status: 'ready', database: 'connected' }, 'Service is ready');
  } catch (error) {
    console.error('[ERROR] Database readiness check failed:', error.code || error.message);
    return failure(res, 'Service is not ready.', 503);
  }
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/public', publicRoutes);
app.use('/api/v1/customer', customerRoutes);
app.use('/api/v1/admin', adminRoutes);

app.use(notFound);
app.use(errorHandler);

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  app.listen(port, () => console.log(`[INFO] Server started on port ${port}`));
}

module.exports = app;