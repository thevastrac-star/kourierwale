const mongoose = require('mongoose');

const codReconSchema = new mongoose.Schema({
  order:        { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
  orderId:      { type: String, required: true },
  user:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  expectedAmt:  { type: Number, required: true },
  receivedAmt:  { type: Number, default: 0 },
  status:       { type: String, enum: ['pending', 'settled', 'disputed'], default: 'pending' },
  settledAt:    { type: Date, default: null },
  settledBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  remarks:      { type: String, default: '' },
  history: [{
    status:     String,
    receivedAmt:Number,
    remarks:    String,
    updatedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp:  { type: Date, default: Date.now },
  }],
}, { timestamps: true });

codReconSchema.index({ status: 1 });

module.exports = mongoose.model('CODRecon', codReconSchema);
