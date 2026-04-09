const mongoose = require('mongoose');

const walletTxnSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type:        { type: String, enum: ['credit', 'debit'], required: true },
  amount:      { type: Number, required: true },
  balance:     { type: Number, required: true }, // balance after txn
  description: { type: String, required: true },
  reference:   { type: String, default: '' },    // order ID, recharge ID, etc.
  method:      { type: String, enum: ['recharge', 'shipping', 'admin', 'refund', 'cod_credit'], default: 'recharge' },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // admin who did it
}, { timestamps: true });

walletTxnSchema.index({ createdAt: -1 });
walletTxnSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('WalletTxn', walletTxnSchema);
