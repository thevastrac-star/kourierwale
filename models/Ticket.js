const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
  sender:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderRole:{ type: String, enum: ['customer', 'admin'], required: true },
  message:   { type: String, required: true },
}, { timestamps: true });

const ticketSchema = new mongoose.Schema({
  ticketId:  { type: String, unique: true },
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subject:   { type: String, required: true },
  category:  { type: String, enum: ['shipping', 'wallet', 'kyc', 'technical', 'other'], default: 'other' },
  priority:  { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  status:    { type: String, enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open' },
  replies:   [replySchema],
}, { timestamps: true });

ticketSchema.pre('save', function(next) {
  if (!this.ticketId) {
    this.ticketId = 'TKT-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase();
  }
  next();
});

ticketSchema.index({ status: 1 });
ticketSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Ticket', ticketSchema);
