const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/Users');
const asyncHandler = require('../utils/asyncHandler');
const RoleModel = require('../models/Role');
const { customAlphabet } = require('nanoid');
const nanoid_user = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 6);

const router = express.Router();

// POST /api/auth/login
router.post('/login', asyncHandler(async (req, res) => {
  // --- FIX #1: Expect 'password' from the frontend ---
  const { email, password } = req.body;
  if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required." });
  }

  const user = await UserModel.findOne({ email });
  if (!user) {
    return res.status(401).json({ success: false, message: "Invalid credentials." });
  }

  // --- FIX #2: Compare the incoming 'password' with the stored 'user.passwordHash' ---
  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: "Invalid credentials." });
  }

  const payload = { id: user._id, name: user.name };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

  res.status(200).json({ success: true, message: "Logged in successfully", token });
}));

// POST /api/auth/signup
router.post('/signup', asyncHandler(async (req, res) => {
  // --- FIX #3: Expect 'password' from the frontend ---
  const { name, email, password } = req.body;

  const existingUser = await UserModel.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ success: false, message: 'Email already exists.' });
  }

  const defaultRole = await RoleModel.findOne({ name: 'Super Admin' }); // Changed to 'User' as it's a more common default
  if (!defaultRole) {
    res.status(500);
    throw new Error('Default user role not found. Please configure roles in the admin panel.');
  }

  // --- FIX #4: Create the user by passing the 'password' to the 'passwordHash' field ---
  const newUser = new UserModel({ 
    _id: `USR-${nanoid_user()}`,
    name, 
    email, 
    passwordHash: password, // The pre-save hook will hash this value
    roleId: defaultRole._id
  });
  await newUser.save();

  const payload = { id: newUser._id, name: newUser.name };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

  res.status(201).json({ success: true, message: 'User created successfully', token });
}));

module.exports = router;