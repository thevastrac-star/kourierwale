const mongoose = require('mongoose');

const kycSchema = new mongoose.Schema({
  user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  docType:    { type: String, enum: ['pan', 'aadhaar', 'gst', 'other'], required: true },
  docNumber:  { type: String, required: true },
  docFront:   { type: String, default: '' }, // file path or base64
  docBack:    { type: String, default: '' },
  status:     { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  reason:     { type: String, default: '' }, // rejection reason
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reviewedAt: { type: Date, default: null },
}, { timestamps: true });

kycSchema.index({ status: 1 });

module.exports = mongoose.model('KYC', kycSchema);
