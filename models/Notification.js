const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type:     { type: String, enum: ['order_created', 'shipped', 'delivered', 'wallet', 'ndr', 'general'], required: true },
  title:    { type: String, required: true },
  message:  { type: String, required: true },
  channel:  { type: String, enum: ['whatsapp', 'email', 'in_app'], default: 'in_app' },
  status:   { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
  reference:{ type: String, default: '' },
  isRead:   { type: Boolean, default: false },
}, { timestamps: true });

notificationSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
