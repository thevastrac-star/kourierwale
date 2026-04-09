const express = require('express');
const router  = express.Router();
const Integration = require('../models/Integration');
const { protect } = require('../middleware/auth');

// ── GET /api/integrations ───────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const integrations = await Integration.find({ user: req.user._id });
    res.json({ success: true, integrations });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── POST /api/integrations  (connect/update) ────────────
router.post('/', protect, async (req, res) => {
  try {
    const { platform, storeName, storeUrl, apiKey, apiSecret, accessToken } = req.body;
    if (!platform) return res.status(400).json({ success: false, message: 'Platform required' });

    let intg = await Integration.findOne({ user: req.user._id, platform });
    if (intg) {
      Object.assign(intg, { storeName, storeUrl, apiKey, apiSecret, accessToken, isConnected: true });
      await intg.save();
    } else {
      intg = await Integration.create({ user: req.user._id, platform, storeName, storeUrl, apiKey, apiSecret, accessToken, isConnected: true });
    }
    res.json({ success: true, integration: intg });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ── DELETE /api/integrations/:id  (disconnect) ──────────
router.delete('/:id', protect, async (req, res) => {
  try {
    await Integration.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { isConnected: false, apiKey: '', apiSecret: '', accessToken: '' });
    res.json({ success: true, message: 'Disconnected' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

module.exports = router;
