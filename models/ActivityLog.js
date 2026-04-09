const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  actor:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  actorRole:  { type: String, default: 'admin' },
  action:     { type: String, required: true },
  resource:   { type: String, required: true }, // e.g. 'wallet', 'kyc', 'user'
  resourceId: { type: String, default: '' },
  details:    { type: mongoose.Schema.Types.Mixed, default: {} },
  ip:         { type: String, default: '' },
}, { timestamps: true });

activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ actor: 1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
