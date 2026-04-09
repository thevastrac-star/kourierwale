// ============================================================
// Kourierwale Backend Server — Express + MongoDB
// ============================================================
require('dotenv').config();
const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const helmet   = require('helmet');
const morgan   = require('morgan');
const path     = require('path');

const authRoutes      = require('./routes/auth');
const orderRoutes     = require('./routes/orders');
const userRoutes      = require('./routes/users');
const trackingRoutes  = require('./routes/tracking');
const analyticsRoutes = require('./routes/analytics');
const walletRoutes    = require('./routes/wallet');
const kycRoutes       = require('./routes/kyc');
const courierRoutes   = require('./routes/couriers');
const ticketRoutes    = require('./routes/tickets');
const warehouseRoutes = require('./routes/warehouses');
const ndrRoutes       = require('./routes/ndr');
const codRoutes       = require('./routes/cod');
const integrationRoutes = require('./routes/integrations');
const miscRoutes      = require('./routes/misc');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── CORS – allow any origin so any hosted frontend can connect
app.use(cors({ origin: '*', methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));
app.options('*', cors());

// ── Security & middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Routes
app.use('/api/auth',         authRoutes);
app.use('/api/orders',       orderRoutes);
app.use('/api/users',        userRoutes);
app.use('/api/tracking',     trackingRoutes);
app.use('/api/analytics',    analyticsRoutes);
app.use('/api/wallet',       walletRoutes);
app.use('/api/kyc',          kycRoutes);
app.use('/api/couriers',     courierRoutes);
app.use('/api/tickets',      ticketRoutes);
app.use('/api/warehouses',   warehouseRoutes);
app.use('/api/ndr',          ndrRoutes);
app.use('/api/cod',          codRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/misc',         miscRoutes);

// ── Health check (Render uses this)
app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: new Date() }));
app.get('/', (_req, res) => res.json({ message: 'Kourierwale API is running 🚀' }));

// ── Error handler
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Server Error' });
});

// ── Connect MongoDB then start
const MONGO_URI = process.env.MONGO_URI ||
  'mongodb+srv://Krist:Krist007@shippro.cjtrkrf.mongodb.net/kourierwale?appName=SHIPPRO';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Atlas connected');
    app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));

    // ── Keep-alive: ping self every 7 minutes to prevent Render sleep
    const SELF_URL = process.env.RENDER_EXTERNAL_URL || process.env.SELF_URL || `http://localhost:${PORT}`;
    setInterval(async () => {
      try {
        const res = await fetch(`${SELF_URL}/api/health`);
        const d = await res.json();
        console.log(`💓 Keep-alive ping: ${d.status} at ${new Date().toISOString()}`);
      } catch (err) {
        console.log(`💓 Keep-alive ping failed: ${err.message}`);
      }
    }, 7 * 60 * 1000); // every 7 minutes
  })
  .catch(err => { console.error('❌ MongoDB failed:', err.message); process.exit(1); });

module.exports = app;
