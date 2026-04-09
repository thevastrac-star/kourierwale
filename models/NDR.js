const mongoose = require('mongoose');

const ndrSchema = new mongoose.Schema({
  order:      { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  reason:     { type: String, default: 'Customer not available' },
  status:     { type: String, enum: ['pending', 'reattempt_requested', 'reattempting', 'delivered', 'returned'], default: 'pending' },
  attempts:   { type: Number, default: 1 },
  remark:     { type: String, default: '' },
  updatedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  history: [{
    status:    String,
    remark:    String,
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

ndrSchema.index({ status: 1 });

module.exports = mongoose.model('NDR', ndrSchema);
