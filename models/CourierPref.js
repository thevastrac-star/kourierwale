const mongoose = require('mongoose');

const courierPrefSchema = new mongoose.Schema({
  user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  priority: [{
    courier: { type: mongoose.Schema.Types.ObjectId, ref: 'Courier', required: true },
    rank:    { type: Number, required: true },
  }],
}, { timestamps: true });

module.exports = mongoose.model('CourierPref', courierPrefSchema);
