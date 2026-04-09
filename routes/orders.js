const express  = require('express');
const router   = express.Router();
const { body, validationResult } = require('express-validator');
const Order    = require('../models/Order');
const { protect, restrictTo } = require('../middleware/auth');

// ── Validation rules ──────────────────────────────────────
const orderValidation = [
  body('sender.name').notEmpty().withMessage('Sender name required'),
  body('sender.phone').notEmpty().withMessage('Sender phone required'),
  body('sender.address').notEmpty().withMessage('Sender address required'),
  body('sender.city').notEmpty().withMessage('Sender city required'),
  body('sender.pincode').notEmpty().withMessage('Sender pincode required'),
  body('receiver.name').notEmpty().withMessage('Receiver name required'),
  body('receiver.phone').notEmpty().withMessage('Receiver phone required'),
  body('receiver.address').notEmpty().withMessage('Receiver address required'),
  body('receiver.city').notEmpty().withMessage('Receiver city required'),
  body('receiver.pincode').notEmpty().withMessage('Receiver pincode required'),
  body('package.description').notEmpty().withMessage('Package description required'),
  body('package.weight').isFloat({ min: 0.1 }).withMessage('Valid weight required'),
];

// ── POST /api/orders ──────────────────────────────────────
router.post('/', protect, orderValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(422).json({ success: false, errors: errors.array() });

  try {
    const data = { ...req.body, customer: req.user._id };

    // Calculate shipping fee (simple weight-based)
    const weight = data.package?.weight || 0;
    data.shippingFee = weight <= 0.5 ? 40 : weight <= 1 ? 60 : weight <= 5 ? 100 : 150;
    if (data.serviceType === 'express')   data.shippingFee *= 1.5;
    if (data.serviceType === 'overnight') data.shippingFee *= 2;

    data.totalAmount = data.shippingFee + (data.codAmount || 0);

    // Initial tracking event
    data.trackingHistory = [{
      status:      'pending',
      description: 'Order placed successfully',
      location:    data.sender?.city || '',
    }];

    // Estimated delivery
    const days = data.serviceType === 'overnight' ? 1 : data.serviceType === 'express' ? 2 : 5;
    data.estimatedDelivery = new Date(Date.now() + days * 86400000);

    const order = await Order.create(data);
    await order.populate('customer', 'name email phone');

    res.status(201).json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/orders  (customer: own orders | admin: all) ──
router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.user.role === 'customer') filter.customer = req.user._id;
    if (status)  filter.status = status;
    if (search)  filter.$or = [
      { orderId: { $regex: search, $options: 'i' } },
      { 'receiver.name': { $regex: search, $options: 'i' } },
    ];

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('customer', 'name email phone')
        .populate('agent', 'name phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Order.countDocuments(filter),
    ]);

    res.json({ success: true, orders, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/orders/:id ───────────────────────────────────
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findOne({
      $or: [{ _id: req.params.id }, { orderId: req.params.id }],
    })
      .populate('customer', 'name email phone')
      .populate('agent', 'name phone email');

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    // Customers can only view their own orders
    if (req.user.role === 'customer' && order.customer._id.toString() !== req.user._id.toString())
      return res.status(403).json({ success: false, message: 'Access denied' });

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── PATCH /api/orders/:id/status  (admin/agent) ──────────
router.patch('/:id/status', protect, restrictTo('admin', 'agent'), async (req, res) => {
  try {
    const { status, description, location } = req.body;
    if (!status) return res.status(400).json({ success: false, message: 'Status required' });

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    order.status = status;
    order.trackingHistory.push({
      status,
      description: description || `Order ${status.replace('_', ' ')}`,
      location:    location || '',
      updatedBy:   req.user._id,
    });

    if (status === 'delivered') order.deliveredAt = new Date();
    await order.save();

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── PUT /api/orders/:id  (admin full update) ─────────────
router.put('/:id', protect, restrictTo('admin'), async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true,
    }).populate('customer', 'name email phone');

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── DELETE /api/orders/:id  (admin) ──────────────────────
router.delete('/:id', protect, restrictTo('admin'), async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, message: 'Order deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
