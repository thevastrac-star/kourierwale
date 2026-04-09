const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone:    { type: String, required: true, trim: true },
    password: { type: String, required: true, minlength: 6, select: false },
    role:     { type: String, enum: ['customer', 'admin', 'agent'], default: 'customer' },
    address: {
      street:  String,
      city:    String,
      state:   String,
      pincode: String,
    },
    isActive:  { type: Boolean, default: true },
    avatar:    { type: String, default: null },
    lastLogin: { type: Date, default: null },

    // ── Wallet ────────────────────────────────────
    walletBalance: { type: Number, default: 0 },

    // ── KYC ───────────────────────────────────────
    kycStatus: { type: String, enum: ['none', 'pending', 'approved', 'rejected'], default: 'none' },

    // ── Fraud Controls ────────────────────────────
    isFlagged:     { type: Boolean, default: false },
    maxOrdersDay:  { type: Number, default: 50 },
    codLimit:      { type: Number, default: 50000 },

    // ── Notification Preferences ──────────────────
    whatsappEnabled: { type: Boolean, default: false },
    whatsappNumber:  { type: String, default: '' },

    // ── Impersonation temp token ──────────────────
    tempToken:      { type: String, default: null, select: false },
    tempTokenExpiry:{ type: Date,   default: null, select: false },
  },
  { timestamps: true }
);

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password
userSchema.methods.comparePassword = async function (plain) {
  return bcrypt.compare(plain, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.tempToken;
  delete obj.tempTokenExpiry;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
