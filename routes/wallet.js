const express = require('express');
const router  = express.Router();
const User       = require('../models/User');
const WalletTxn  = require('../models/Wallet');
const ActivityLog = require('../models/ActivityLog');
const { protect, restrictTo } = require('../middleware/auth');

// ── GET /api/wallet/balance  (own balance) ──────────────
router.get('/balance', protect, async (req, res) => {
  try {
    res.json({ success: true, balance: req.user.walletBalance || 0 });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── GET /api/wallet/transactions  (own history) ─────────
router.get('/transactions', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const filter = { user: req.user._id };
    const [txns, total] = await Promise.all([
      WalletTxn.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)),
      WalletTxn.countDocuments(filter),
    ]);
    res.json({ success: true, txns, total, page: Number(page) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── POST /api/wallet/recharge  (client UI only – dummy) ─
router.post('/recharge', protect, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'Valid amount required' });

    const user = await User.findById(req.user._id);
    user.walletBalance = (user.walletBalance || 0) + Number(amount);
    await user.save({ validateBeforeSave: false });

    const txn = await WalletTxn.create({
      user: user._id, type: 'credit', amount: Number(amount),
      balance: user.walletBalance, description: 'Wallet recharge',
      method: 'recharge',
    });

    res.json({ success: true, balance: user.walletBalance, txn });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── GET /api/wallet/user/:userId  (admin) ───────────────
router.get('/user/:userId', protect, restrictTo('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const { page = 1, limit = 20 } = req.query;
    const [txns, total] = await Promise.all([
      WalletTxn.find({ user: user._id }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)),
      WalletTxn.countDocuments({ user: user._id }),
    ]);
    res.json({ success: true, balance: user.walletBalance || 0, txns, total, user: { name: user.name, email: user.email } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── POST /api/wallet/admin-adjust  (admin add/deduct) ───
router.post('/admin-adjust', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { userId, amount, type, description } = req.body;
    if (!userId || !amount || !type) return res.status(400).json({ success: false, message: 'userId, amount, type required' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (type === 'credit') user.walletBalance = (user.walletBalance || 0) + Number(amount);
    else user.walletBalance = (user.walletBalance || 0) - Number(amount);

    await user.save({ validateBeforeSave: false });

    const txn = await WalletTxn.create({
      user: user._id, type, amount: Number(amount),
      balance: user.walletBalance,
      description: description || `Admin ${type}`,
      method: 'admin', performedBy: req.user._id,
    });

    await ActivityLog.create({
      actor: req.user._id, action: `wallet_${type}`, resource: 'wallet',
      resourceId: user._id.toString(),
      details: { amount, newBalance: user.walletBalance, description },
    });

    res.json({ success: true, balance: user.walletBalance, txn });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── GET /api/wallet/recharges  (admin – recharge monitor) ─
router.get('/recharges', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 20, userId, from, to } = req.query;
    const filter = { method: 'recharge' };
    if (userId) filter.user = userId;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }
    const [txns, total, totalAmtAgg] = await Promise.all([
      WalletTxn.find(filter).populate('user', 'name email phone').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)),
      WalletTxn.countDocuments(filter),
      WalletTxn.aggregate([{ $match: filter }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    ]);
    res.json({ success: true, txns, total, totalRechargeAmount: totalAmtAgg[0]?.total || 0, page: Number(page) });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── GET /api/wallet/export  (CSV export) ──────────────────
router.get('/export', protect, async (req, res) => {
  try {
    const filter = req.user.role === 'admin' && req.query.userId
      ? { user: req.query.userId }
      : req.user.role === 'admin' ? {} : { user: req.user._id };

    const txns = await WalletTxn.find(filter).populate('user', 'name email').sort({ createdAt: -1 }).limit(5000);
    let csv = 'Date,User,Type,Amount,Balance,Description,Method\n';
    txns.forEach(t => {
      csv += `${t.createdAt.toISOString()},${t.user?.name || ''},${t.type},${t.amount},${t.balance},"${t.description}",${t.method}\n`;
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=wallet_history.csv');
    res.send(csv);
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
