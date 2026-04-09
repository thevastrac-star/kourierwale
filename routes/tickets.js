const express = require('express');
const router  = express.Router();
const Ticket = require('../models/Ticket');
const { protect, restrictTo } = require('../middleware/auth');

// ── POST /api/tickets  (client creates ticket) ──────────
router.post('/', protect, async (req, res) => {
  try {
    const { subject, category, priority, message } = req.body;
    if (!subject || !message) return res.status(400).json({ success: false, message: 'Subject and message required' });
    const ticket = await Ticket.create({
      user: req.user._id, subject, category, priority,
      replies: [{ sender: req.user._id, senderRole: req.user.role, message }],
    });
    res.status(201).json({ success: true, ticket });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── GET /api/tickets  (client: own | admin: all) ────────
router.get('/', protect, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = req.user.role === 'admin' ? {} : { user: req.user._id };
    if (status) filter.status = status;
    const [tickets, total] = await Promise.all([
      Ticket.find(filter).populate('user', 'name email phone').sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(Number(limit)),
      Ticket.countDocuments(filter),
    ]);
    res.json({ success: true, tickets, total });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── GET /api/tickets/:id ────────────────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('replies.sender', 'name role');
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    if (req.user.role !== 'admin' && ticket.user._id.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Access denied' });
    res.json({ success: true, ticket });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── POST /api/tickets/:id/reply ─────────────────────────
router.post('/:id/reply', protect, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'Message required' });
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    ticket.replies.push({ sender: req.user._id, senderRole: req.user.role, message });
    if (req.user.role === 'admin' && ticket.status === 'open') ticket.status = 'in_progress';
    await ticket.save();
    res.json({ success: true, ticket });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── PATCH /api/tickets/:id/status  (admin) ──────────────
router.patch('/:id/status', protect, restrictTo('admin'), async (req, res) => {
  try {
    const ticket = await Ticket.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });
    res.json({ success: true, ticket });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
