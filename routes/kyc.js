const express = require('express');
const router  = express.Router();
const KYC        = require('../models/KYC');
const User       = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { protect, restrictTo } = require('../middleware/auth');

// ── POST /api/kyc  (user uploads KYC) ───────────────────
router.post('/', protect, async (req, res) => {
  try {
    const { docType, docNumber, docFront, docBack } = req.body;
    if (!docType || !docNumber) return res.status(400).json({ success: false, message: 'docType and docNumber required' });

    const kyc = await KYC.create({ user: req.user._id, docType, docNumber, docFront, docBack });

    await User.findByIdAndUpdate(req.user._id, { kycStatus: 'pending' });
    res.status(201).json({ success: true, kyc });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── GET /api/kyc  (user: own KYC | admin: all) ────────
router.get('/', protect, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = req.user.role === 'admin' ? {} : { user: req.user._id };
    if (status) filter.status = status;
    const [docs, total] = await Promise.all([
      KYC.find(filter).populate('user', 'name email phone').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)),
      KYC.countDocuments(filter),
    ]);
    res.json({ success: true, docs, total });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── PATCH /api/kyc/:id/review  (admin) ──────────────────
router.patch('/:id/review', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { status, reason } = req.body;
    if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ success: false, message: 'Status must be approved or rejected' });

    const kyc = await KYC.findByIdAndUpdate(req.params.id, {
      status, reason: reason || '', reviewedBy: req.user._id, reviewedAt: new Date(),
    }, { new: true }).populate('user', 'name email');

    if (!kyc) return res.status(404).json({ success: false, message: 'KYC not found' });

    await User.findByIdAndUpdate(kyc.user._id, { kycStatus: status });

    await ActivityLog.create({
      actor: req.user._id, action: `kyc_${status}`, resource: 'kyc',
      resourceId: kyc._id.toString(), details: { reason, userId: kyc.user._id },
    });

    res.json({ success: true, kyc });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
