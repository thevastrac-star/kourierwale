const express = require('express');
const router  = express.Router();
const Order   = require('../models/Order');

// ── GET /api/tracking/:orderId  (public) ──────────────────
// Anyone can track an order by its human-readable ID
router.get('/:orderId', async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId.toUpperCase() })
      .select('orderId status trackingHistory estimatedDelivery deliveredAt sender receiver package serviceType');

    if (!order)
      return res.status(404).json({ success: false, message: 'Order not found. Please check the tracking ID.' });

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
