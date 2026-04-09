const express = require('express');
const router  = express.Router();
const Order   = require('../models/Order');
const User    = require('../models/User');
const WalletTxn = require('../models/Wallet');
const CODRecon  = require('../models/CODRecon');
const { protect, restrictTo } = require('../middleware/auth');

// ── GET /api/analytics/summary  (admin) ───────────────────
router.get('/summary', protect, restrictTo('admin'), async (req, res) => {
  try {
    const now       = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalOrders,
      pendingOrders,
      deliveredOrders,
      cancelledOrders,
      returnedOrders,
      todayOrders,
      monthOrders,
      totalRevenue,
      monthRevenue,
      totalUsers,
      newUsersMonth,
      recentOrders,
      codPendingAgg,
      totalRechargeAgg,
    ] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ status: 'pending' }),
      Order.countDocuments({ status: 'delivered' }),
      Order.countDocuments({ status: 'cancelled' }),
      Order.countDocuments({ status: 'returned' }),
      Order.countDocuments({ createdAt: { $gte: startOfDay } }),
      Order.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Order.aggregate([{ $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
      Order.aggregate([
        { $match: { createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      User.countDocuments({ role: 'customer' }),
      User.countDocuments({ role: 'customer', createdAt: { $gte: startOfMonth } }),
      Order.find().sort({ createdAt: -1 }).limit(5).populate('customer', 'name'),
      CODRecon.aggregate([{ $match: { status: 'pending' } }, { $group: { _id: null, total: { $sum: '$expectedAmt' } } }]).catch(() => []),
      WalletTxn.aggregate([{ $match: { method: 'recharge' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]).catch(() => []),
    ]);

    // Orders per status breakdown
    const statusBreakdown = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    // Last 7 days trend
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
    const dailyTrend = await Order.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count:   { $sum: 1 },
        revenue: { $sum: '$totalAmount' },
      }},
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      stats: {
        totalOrders,
        pendingOrders,
        deliveredOrders,
        cancelledOrders,
        returnedOrders,
        rtoCount: returnedOrders,
        todayOrders,
        monthOrders,
        totalRevenue:  totalRevenue[0]?.total  || 0,
        monthRevenue:  monthRevenue[0]?.total  || 0,
        totalUsers,
        newUsersMonth,
        statusBreakdown,
        dailyTrend,
        recentOrders,
        codPendingAmount: codPendingAgg[0]?.total || 0,
        totalRechargeAmount: totalRechargeAgg[0]?.total || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
