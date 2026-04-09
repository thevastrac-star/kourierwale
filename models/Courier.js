const mongoose = require('mongoose');

const rateRuleSchema = new mongoose.Schema({
  zone:       { type: String, default: 'default' },
  minWeight:  { type: Number, default: 0 },
  maxWeight:  { type: Number, default: 100 },
  basePrice:  { type: Number, required: true },
  perKgPrice: { type: Number, default: 0 },
  codCharge:  { type: Number, default: 0 },
}, { _id: false });

const courierSchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true },
  code:       { type: String, required: true, unique: true, uppercase: true, trim: true },
  isActive:   { type: Boolean, default: true },
  logo:       { type: String, default: '' },
  // API config (stored, not used yet)
  apiConfig: {
    baseUrl:  { type: String, default: '' },
    apiKey:   { type: String, default: '' },
    apiSecret:{ type: String, default: '' },
    extra:    { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  rates:      [rateRuleSchema],
  rateHistory: [{
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changedAt: { type: Date, default: Date.now },
    oldRates:  { type: mongoose.Schema.Types.Mixed },
    newRates:  { type: mongoose.Schema.Types.Mixed },
  }],
}, { timestamps: true });

module.exports = mongoose.model('Courier', courierSchema);
