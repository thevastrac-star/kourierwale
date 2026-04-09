const mongoose = require('mongoose');

const warehouseSchema = new mongoose.Schema({
  user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name:       { type: String, required: true, trim: true },
  contactName:{ type: String, required: true },
  phone:      { type: String, required: true },
  email:      { type: String, default: '' },
  address:    { type: String, required: true },
  city:       { type: String, required: true },
  state:      { type: String, required: true },
  pincode:    { type: String, required: true },
  isDefault:  { type: Boolean, default: false },
  isActive:   { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Warehouse', warehouseSchema);
