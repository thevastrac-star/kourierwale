const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User    = require('../models/User');
const { protect } = require('../middleware/auth');

// ── JWT secret fallback (baked in — also set in .env on Render)
const JWT_SECRET = process.env.JWT_SECRET ||
  'de72c8fe625aa7001c8eeb938c96bbfbcda4c43ef589fcad003bdd9006df7a2f4d6fef2dde4158ea82ed7473a6b870a8861ecc3e6911c3507148467d71242041';

const signToken = (id) =>
  jwt.sign({ id }, JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// ── POST /api/auth/register
router.post('/register',
  [
    body('name').trim().notEmpty().withMessage('Name required'),
    body('email').isEmail().withMessage('Valid email required'),
    body('phone').notEmpty().withMessage('Phone required'),
    body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ success: false, errors: errors.array() });
    try {
      const { name, email, phone, password } = req.body;
      if (await User.findOne({ email }))
        return res.status(400).json({ success: false, message: 'Email already registered' });
      const user  = await User.create({ name, email, phone, password });
      const token = signToken(user._id);
      res.status(201).json({ success: true, token, user });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ── POST /api/auth/login
router.post('/login',
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ success: false, errors: errors.array() });
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email }).select('+password');
      if (!user || !(await user.comparePassword(password)))
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      if (!user.isActive)
        return res.status(403).json({ success: false, message: 'Account disabled' });
      user.lastLogin = new Date();
      await user.save({ validateBeforeSave: false });
      const token = signToken(user._id);
      res.json({ success: true, token, user });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  }
);

// ── GET /api/auth/me
router.get('/me', protect, (req, res) => {
  res.json({ success: true, user: req.user });
});

// ── POST /api/auth/logout
router.post('/logout', protect, (_req, res) => {
  res.json({ success: true, message: 'Logged out' });
});

module.exports = router;
