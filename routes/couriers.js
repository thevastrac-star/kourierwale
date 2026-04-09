const express = require('express');
const router  = express.Router();
const Courier    = require('../models/Courier');
const ActivityLog = require('../models/ActivityLog');
const { protect, restrictTo } = require('../middleware/auth');

// ── GET /api/couriers  (any auth user) ──────────────────
router.get('/', protect, async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { isActive: true };
    const couriers = await Courier.find(filter).sort({ name: 1 });
    res.json({ success: true, couriers });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── POST /api/couriers  (admin) ─────────────────────────
router.post('/', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { name, code, logo, rates, apiConfig } = req.body;
    if (!name || !code) return res.status(400).json({ success: false, message: 'Name and code required' });
    const courier = await Courier.create({ name, code, logo, rates: rates || [], apiConfig: apiConfig || {} });

    await ActivityLog.create({
      actor: req.user._id, action: 'courier_created', resource: 'courier',
      resourceId: courier._id.toString(), details: { name, code },
    });

    res.status(201).json({ success: true, courier });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── PATCH /api/couriers/:id  (admin) ────────────────────
router.patch('/:id', protect, restrictTo('admin'), async (req, res) => {
  try {
    const old = await Courier.findById(req.params.id);
    if (!old) return res.status(404).json({ success: false, message: 'Courier not found' });

    // If rates changed, save history
    if (req.body.rates) {
      old.rateHistory.push({ changedBy: req.user._id, oldRates: old.rates, newRates: req.body.rates });
    }

    Object.assign(old, req.body);
    await old.save();

    await ActivityLog.create({
      actor: req.user._id, action: 'courier_updated', resource: 'courier',
      resourceId: old._id.toString(), details: req.body,
    });

    res.json({ success: true, courier: old });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── DELETE /api/couriers/:id  (admin – soft disable) ────
router.delete('/:id', protect, restrictTo('admin'), async (req, res) => {
  try {
    const courier = await Courier.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!courier) return res.status(404).json({ success: false, message: 'Courier not found' });
    res.json({ success: true, courier });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
