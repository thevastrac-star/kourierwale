const express = require('express');
const router  = express.Router();
const Notification = require('../models/Notification');
const CourierPref  = require('../models/CourierPref');
const Settings     = require('../models/Settings');
const ActivityLog  = require('../models/ActivityLog');
const User         = require('../models/User');
const Order        = require('../models/Order');
const { protect, restrictTo } = require('../middleware/auth');

// ═══════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════

// ── GET /api/misc/notifications ─────────────────────────
router.get('/notifications', protect, async (req, res) => {
  try {
    const notifs = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, notifications: notifs });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── POST /api/misc/notifications  (system/admin creates) ─
router.post('/notifications', protect, async (req, res) => {
  try {
    const notif = await Notification.create({ ...req.body, user: req.body.userId || req.user._id });
    res.status(201).json({ success: true, notification: notif });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── PATCH /api/misc/whatsapp-toggle ─────────────────────
router.patch('/whatsapp-toggle', protect, async (req, res) => {
  try {
    const { enabled, whatsappNumber } = req.body;
    await User.findByIdAndUpdate(req.user._id, { whatsappEnabled: enabled, whatsappNumber: whatsappNumber || '' });
    res.json({ success: true, message: 'WhatsApp preference updated' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ═══════════════════════════════════════════════════════
// COURIER PREFERENCES
// ═══════════════════════════════════════════════════════

// ── GET /api/misc/courier-pref ──────────────────────────
router.get('/courier-pref', protect, async (req, res) => {
  try {
    const pref = await CourierPref.findOne({ user: req.user._id }).populate('priority.courier', 'name code logo isActive');
    res.json({ success: true, pref });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── POST /api/misc/courier-pref ─────────────────────────
router.post('/courier-pref', protect, async (req, res) => {
  try {
    const { priority } = req.body; // [{courier: id, rank: 1}, ...]
    let pref = await CourierPref.findOne({ user: req.user._id });
    if (pref) { pref.priority = priority; await pref.save(); }
    else { pref = await CourierPref.create({ user: req.user._id, priority }); }
    res.json({ success: true, pref });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ═══════════════════════════════════════════════════════
// SETTINGS (admin)
// ═══════════════════════════════════════════════════════

// ── GET /api/misc/settings ──────────────────────────────
router.get('/settings', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { group } = req.query;
    const filter = group ? { group } : {};
    const settings = await Settings.find(filter);
    res.json({ success: true, settings });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── POST /api/misc/settings ─────────────────────────────
router.post('/settings', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { key, value, label, group } = req.body;
    const setting = await Settings.findOneAndUpdate(
      { key },
      { value, label, group },
      { new: true, upsert: true }
    );
    await ActivityLog.create({ actor: req.user._id, action: 'settings_updated', resource: 'settings', resourceId: key, details: { value } });
    res.json({ success: true, setting });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ═══════════════════════════════════════════════════════
// FRAUD CONTROLS (admin)
// ═══════════════════════════════════════════════════════

// ── POST /api/misc/fraud-controls ───────────────────────
router.post('/fraud-controls', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { userId, maxOrdersDay, codLimit, isFlagged, isActive } = req.body;
    const updates = {};
    if (maxOrdersDay !== undefined) updates.maxOrdersDay = maxOrdersDay;
    if (codLimit !== undefined) updates.codLimit = codLimit;
    if (isFlagged !== undefined) updates.isFlagged = isFlagged;
    if (isActive !== undefined) updates.isActive = isActive;

    const user = await User.findByIdAndUpdate(userId, updates, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    await ActivityLog.create({
      actor: req.user._id, action: 'fraud_control_update', resource: 'user',
      resourceId: userId, details: updates,
    });

    res.json({ success: true, user });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ═══════════════════════════════════════════════════════
// IMPERSONATION (admin)
// ═══════════════════════════════════════════════════════
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET ||
  'de72c8fe625aa7001c8eeb938c96bbfbcda4c43ef589fcad003bdd9006df7a2f4d6fef2dde4158ea82ed7473a6b870a8861ecc3e6911c3507148467d71242041';

router.post('/impersonate', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const tempToken = jwt.sign({ id: user._id, impersonatedBy: req.user._id }, JWT_SECRET, { expiresIn: '1h' });

    await ActivityLog.create({
      actor: req.user._id, action: 'impersonation', resource: 'user',
      resourceId: userId, details: { adminId: req.user._id, adminName: req.user.name },
    });

    res.json({ success: true, token: tempToken, user });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ═══════════════════════════════════════════════════════
// ACTIVITY LOGS (admin)
// ═══════════════════════════════════════════════════════
router.get('/activity-logs', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const [logs, total] = await Promise.all([
      ActivityLog.find().populate('actor', 'name email').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit)),
      ActivityLog.countDocuments(),
    ]);
    res.json({ success: true, logs, total });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ═══════════════════════════════════════════════════════
// PINCODE LOOKUP
// ═══════════════════════════════════════════════════════
router.get('/pincode/:pincode', async (req, res) => {
  try {
    const pin = req.params.pincode;
    // Try India Post API first, fallback to mock
    try {
      const response = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      const data = await response.json();
      if (data[0]?.Status === 'Success' && data[0]?.PostOffice?.length) {
        const po = data[0].PostOffice[0];
        return res.json({ success: true, city: po.District, state: po.State, country: po.Country });
      }
    } catch { /* fallback to mock */ }
    // Mock fallback
    const mockData = {
      '110001': { city: 'New Delhi', state: 'Delhi' },
      '400001': { city: 'Mumbai', state: 'Maharashtra' },
      '560001': { city: 'Bangalore', state: 'Karnataka' },
      '600001': { city: 'Chennai', state: 'Tamil Nadu' },
      '700001': { city: 'Kolkata', state: 'West Bengal' },
    };
    const mock = mockData[pin];
    if (mock) return res.json({ success: true, ...mock });
    res.json({ success: false, message: 'Pincode not found' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ═══════════════════════════════════════════════════════
// EXPORT SYSTEM
// ═══════════════════════════════════════════════════════

// ── GET /api/misc/export/users  (admin) ─────────────────
router.get('/export/users', protect, restrictTo('admin'), async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).limit(10000);
    let csv = 'Name,Email,Phone,Role,Active,Wallet,KYC,Joined\n';
    users.forEach(u => {
      csv += `"${u.name}",${u.email},${u.phone},${u.role},${u.isActive},${u.walletBalance},${u.kycStatus},${u.createdAt.toISOString()}\n`;
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=users.csv');
    res.send(csv);
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── GET /api/misc/export/orders ─────────────────────────
router.get('/export/orders', protect, async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? (req.query.userId ? { customer: req.query.userId } : {}) : { customer: req.user._id };
    const orders = await Order.find(filter).populate('customer', 'name email').sort({ createdAt: -1 }).limit(10000);
    let csv = 'OrderID,Customer,SenderCity,ReceiverCity,Status,Service,Payment,ShippingFee,COD,Total,Date\n';
    orders.forEach(o => {
      csv += `${o.orderId},"${o.customer?.name || ''}",${o.sender?.city},${o.receiver?.city},${o.status},${o.serviceType},${o.paymentMode},${o.shippingFee},${o.codAmount},${o.totalAmount},${o.createdAt.toISOString()}\n`;
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=orders.csv');
    res.send(csv);
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ═══════════════════════════════════════════════════════
// ORDER VALIDATION (duplicate check)
// ═══════════════════════════════════════════════════════
router.post('/validate-order', protect, async (req, res) => {
  try {
    const { receiverPhone, receiverPincode } = req.body;
    // Check duplicate: same phone + pincode in last 24h
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const dup = await Order.findOne({
      customer: req.user._id,
      'receiver.phone': receiverPhone,
      'receiver.pincode': receiverPincode,
      createdAt: { $gte: since },
    });
    if (dup) return res.json({ success: true, isDuplicate: true, orderId: dup.orderId });
    res.json({ success: true, isDuplicate: false });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ═══════════════════════════════════════════════════════
// BULK UPLOAD (structure only)
// ═══════════════════════════════════════════════════════
router.post('/bulk-upload', protect, async (req, res) => {
  try {
    const { orders } = req.body; // array of order objects from CSV parse
    if (!orders || !orders.length) return res.status(400).json({ success: false, message: 'No orders provided' });

    const results = { created: 0, failed: 0, errors: [] };
    for (const orderData of orders) {
      try {
        orderData.customer = req.user._id;
        const weight = orderData.package?.weight || 0.5;
        orderData.shippingFee = weight <= 0.5 ? 40 : weight <= 1 ? 60 : weight <= 5 ? 100 : 150;
        orderData.totalAmount = orderData.shippingFee + (orderData.codAmount || 0);
        orderData.trackingHistory = [{ status: 'pending', description: 'Order placed via bulk upload', location: orderData.sender?.city || '' }];
        orderData.estimatedDelivery = new Date(Date.now() + 5 * 86400000);
        await Order.create(orderData);
        results.created++;
      } catch (e) {
        results.failed++;
        results.errors.push(e.message);
      }
    }
    res.json({ success: true, results });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
