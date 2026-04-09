require('dotenv').config();
const mongoose = require('mongoose');
const User     = require('../models/User');

const MONGO_URI = process.env.MONGO_URI ||
  'mongodb+srv://Krist:Krist007@shippro.cjtrkrf.mongodb.net/kourierwale?appName=SHIPPRO';

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB Atlas');

  const email = process.env.ADMIN_EMAIL || 'admin@kourierwale.com';
  const exists = await User.findOne({ email });
  if (exists) {
    console.log('ℹ️  Admin already exists → Skipping');
    process.exit(0);
  }

  await User.create({
    name:     'Super Admin',
    email,
    phone:    '9999999999',
    password: process.env.ADMIN_PASSWORD || 'Admin@123456',
    role:     'admin',
    isActive: true,
  });

  console.log('🌱 Admin seeded!');
  console.log('   Email:    ' + email);
  console.log('   Password: ' + (process.env.ADMIN_PASSWORD || 'Admin@123456'));
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
