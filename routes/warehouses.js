const express = require('express');
const router  = express.Router();
const Warehouse = require('../models/Warehouse');
const { protect } = require('../middleware/auth');

// ── GET /api/warehouses ─────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const warehouses = await Warehouse.find({ user: req.user._id, isActive: true }).sort({ isDefault: -1, createdAt: -1 });
    res.json({ success: true, warehouses });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── POST /api/warehouses ────────────────────────────────
router.post('/', protect, async (req, res) => {
  try {
    const data = { ...req.body, user: req.user._id };
    if (data.isDefault) await Warehouse.updateMany({ user: req.user._id }, { isDefault: false });
    const wh = await Warehouse.create(data);
    res.status(201).json({ success: true, warehouse: wh });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── PUT /api/warehouses/:id ─────────────────────────────
router.put('/:id', protect, async (req, res) => {
  try {
    const wh = await Warehouse.findOne({ _id: req.params.id, user: req.user._id });
    if (!wh) return res.status(404).json({ success: false, message: 'Warehouse not found' });
    if (req.body.isDefault) await Warehouse.updateMany({ user: req.user._id }, { isDefault: false });
    Object.assign(wh, req.body);
    await wh.save();
    res.json({ success: true, warehouse: wh });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── DELETE /api/warehouses/:id ──────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const wh = await Warehouse.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isActive: false }, { new: true }
    );
    if (!wh) return res.status(404).json({ success: false, message: 'Warehouse not found' });
    res.json({ success: true, message: 'Warehouse deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
