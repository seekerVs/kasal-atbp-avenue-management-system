// In server/models/Users.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  // --- MODIFIED: Use a custom string _id ---
  _id: {
    type: String,
    required: true,
  },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  roleId: { 
    type: String, 
    ref: 'Role', 
    required: true 
  },
  // --- NEW: Add the status field ---
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active',
  },
}, { 
  timestamps: true,
  _id: false // --- Crucial for using our custom string _id ---
});

// Mongoose "pre-save" hook remains the same
UserSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error);
  }
});

const UserModel = mongoose.model("user", UserSchema);
module.exports = UserModel;