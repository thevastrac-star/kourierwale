const mongoose = require('mongoose');
const { nanoid } = require('nanoid');

// ── Tracking event sub-schema ─────────────────────────────
const trackingEventSchema = new mongoose.Schema(
  {
    status:      { type: String, required: true },
    description: { type: String, required: true },
    location:    { type: String, default: '' },
    timestamp:   { type: Date, default: Date.now },
    updatedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: false }
);

// ── Order main schema ─────────────────────────────────────
const orderSchema = new mongoose.Schema(
  {
    // Human-readable order ID (e.g. KW-AB12CD)
    orderId: {
      type:    String,
      unique:  true,
      default: () => 'KW-' + nanoid(6).toUpperCase(),
    },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'User',
      required: true,
    },

    // Sender details
    sender: {
      name:    { type: String, required: true },
      phone:   { type: String, required: true },
      email:   { type: String },
      address: { type: String, required: true },
      city:    { type: String, required: true },
      state:   { type: String, required: true },
      pincode: { type: String, required: true },
    },

    // Receiver details
    receiver: {
      name:    { type: String, required: true },
      phone:   { type: String, required: true },
      email:   { type: String },
      address: { type: String, required: true },
      city:    { type: String, required: true },
      state:   { type: String, required: true },
      pincode: { type: String, required: true },
    },

    // Package details
    package: {
      description: { type: String, required: true },
      weight:      { type: Number, required: true }, // kg
      length:      { type: Number },                 // cm
      width:       { type: Number },
      height:      { type: Number },
      value:       { type: Number, default: 0 },     // declared value ₹
      fragile:     { type: Boolean, default: false },
    },

    // Service
    serviceType: {
      type:    String,
      enum:    ['standard', 'express', 'overnight', 'cod'],
      default: 'standard',
    },

    // Payment
    paymentMode: {
      type:    String,
      enum:    ['prepaid', 'cod', 'wallet'],
      default: 'cod',
    },
    codAmount:   { type: Number, default: 0 },
    shippingFee: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    isPaid:      { type: Boolean, default: false },

    // Status lifecycle
    status: {
      type:    String,
      enum:    ['pending', 'confirmed', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'cancelled', 'returned'],
      default: 'pending',
    },

    // Assigned delivery agent
    agent: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'User',
      default: null,
    },

    // Full tracking timeline
    trackingHistory: [trackingEventSchema],

    // Estimated & actual delivery
    estimatedDelivery: { type: Date },
    deliveredAt:       { type: Date },

    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

// Indexes for fast look-up
orderSchema.index({ orderId: 1 });
orderSchema.index({ customer: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
