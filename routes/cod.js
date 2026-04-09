const express = require('express');
const router  = express.Router();
const CODRecon = require('../models/CODRecon');
const Order = require('../models/Order');
const { protect, restrictTo } = require('../middleware/auth');

// ── GET /api/cod  (admin) ───────────────────────────────
router.get('/', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const [records, total, pendingAgg] = await Promise.all([
      CODRecon.find(filter).populate('user', 'name email').sort({ createdAt: -1 })
        .skip((page - 1) * limit).limit(Number(limit)),
      CODRecon.countDocuments(filter),
      CODRecon.aggregate([
        { $match: { status: 'pending' } },
        { $group: { _id: null, total: { $sum: '$expectedAmt' }, received: { $sum: '$receivedAmt' } } },
      ]),
    ]);
    res.json({
      success: true, records, total,
      pendingTotal: pendingAgg[0]?.total || 0,
      receivedTotal: pendingAgg[0]?.received || 0,
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── POST /api/cod  (auto-create when COD order delivered) ─
router.post('/', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { orderId, expectedAmt } = req.body;
    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    const rec = await CODRecon.create({
      order: order._id, orderId: order.orderId, user: order.customer,
      expectedAmt: expectedAmt || order.codAmount,
    });
    res.status(201).json({ success: true, record: rec });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── PATCH /api/cod/:id  (admin updates reconciliation) ──
router.patch('/:id', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { status, receivedAmt, remarks } = req.body;
    const rec = await CODRecon.findById(req.params.id);
    if (!rec) return res.status(404).json({ success: false, message: 'Record not found' });

    if (receivedAmt !== undefined) rec.receivedAmt = receivedAmt;
    if (status) {
      rec.status = status;
      if (status === 'settled') { rec.settledAt = new Date(); rec.settledBy = req.user._id; }
    }
    rec.remarks = remarks || rec.remarks;
    rec.history.push({ status: rec.status, receivedAmt: rec.receivedAmt, remarks, updatedBy: req.user._id });
    await rec.save();
    res.json({ success: true, record: rec });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
