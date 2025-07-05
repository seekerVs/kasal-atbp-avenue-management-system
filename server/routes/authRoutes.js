const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/Users');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// POST /api/auth/login
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required." });
  }

  const user = await UserModel.findOne({ email });
  if (!user) {
    return res.status(401).json({ success: false, message: "Invalid credentials." });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: "Invalid credentials." });
  }

  const payload = { id: user._id, name: user.name };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

  res.status(200).json({ success: true, message: "Logged in successfully", token });
}));

// POST /api/auth/signup
router.post('/signup', asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existingUser = await UserModel.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ success: false, message: 'Email already exists.' });
  }

  const newUser = new UserModel({ name, email, password });
  await newUser.save();

  const payload = { id: newUser._id, name: newUser.name };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

  res.status(201).json({ success: true, message: 'User created successfully', token });
}));

module.exports = router;