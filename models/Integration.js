const mongoose = require('mongoose');

const integrationSchema = new mongoose.Schema({
  user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  platform:   { type: String, enum: ['shopify', 'woocommerce'], required: true },
  storeName:  { type: String, default: '' },
  storeUrl:   { type: String, default: '' },
  apiKey:     { type: String, default: '' },
  apiSecret:  { type: String, default: '' },
  accessToken:{ type: String, default: '' },
  isConnected:{ type: Boolean, default: false },
  lastSyncAt: { type: Date, default: null },
}, { timestamps: true });

integrationSchema.index({ user: 1, platform: 1 }, { unique: true });

module.exports = mongoose.model('Integration', integrationSchema);
