const express = require('express');
const router  = express.Router();
const NDR = require('../models/NDR');
const Order = require('../models/Order');
const { protect, restrictTo } = require('../middleware/auth');

// ── GET /api/ndr  (client: own NDRs | admin: all) ──────
router.get('/', protect, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = req.user.role === 'admin' ? {} : { user: req.user._id };
    if (status) filter.status = status;
    const [ndrs, total] = await Promise.all([
      NDR.find(filter).populate('order', 'orderId receiver status totalAmount').populate('user', 'name email')
        .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)),
      NDR.countDocuments(filter),
    ]);
    res.json({ success: true, ndrs, total });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── POST /api/ndr  (admin creates NDR manually or system) ─
router.post('/', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { orderId, reason } = req.body;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    const ndr = await NDR.create({
      order: order._id, user: order.customer,
      reason: reason || 'Customer not available',
      history: [{ status: 'pending', remark: reason || 'NDR created', updatedBy: req.user._id }],
    });
    res.status(201).json({ success: true, ndr });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── PATCH /api/ndr/:id/reattempt  (client requests reattempt) ─
router.patch('/:id/reattempt', protect, async (req, res) => {
  try {
    const ndr = await NDR.findById(req.params.id);
    if (!ndr) return res.status(404).json({ success: false, message: 'NDR not found' });
    ndr.status = 'reattempt_requested';
    ndr.history.push({ status: 'reattempt_requested', remark: 'Reattempt requested by customer', updatedBy: req.user._id });
    await ndr.save();
    res.json({ success: true, ndr });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── PATCH /api/ndr/:id/status  (admin updates) ─────────
router.patch('/:id/status', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { status, remark } = req.body;
    const ndr = await NDR.findById(req.params.id);
    if (!ndr) return res.status(404).json({ success: false, message: 'NDR not found' });
    ndr.status = status;
    ndr.remark = remark || '';
    ndr.updatedBy = req.user._id;
    if (status === 'reattempting') ndr.attempts += 1;
    ndr.history.push({ status, remark, updatedBy: req.user._id });
    await ndr.save();
    res.json({ success: true, ndr });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
