// server/routes/userRoutes.js

const express = require('express');
const User = require('../models/Users');
const asyncHandler = require('../utils/asyncHandler');
const { protect, isSuperAdmin } = require('../middleware/authMiddleware');
const { sanitizeRequestBody } = require('../middleware/sanitizeMiddleware');
const { customAlphabet } = require('nanoid');
const bcrypt = require('bcryptjs');

const router = express.Router();

const nanoid_user = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 6);

// --- GET ALL USERS (WITH ROLE POPULATED) ---
// GET /api/users
router.get('/', protect, isSuperAdmin, asyncHandler(async (req, res) => {
    const users = await User.find({}).sort({ name: 1 });
    res.status(200).json(users);
}));

router.get('/me', protect, asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select('-passwordHash');
    if (!user) {
        res.status(404);
        throw new Error('User not found.');
    }
    res.status(200).json(user);
}));

// PUT /api/users/me
router.put('/me', protect, sanitizeRequestBody, asyncHandler(async (req, res) => {
    const { name, email } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) { res.status(404); throw new Error('User not found.'); }
    if (email && email !== user.email) {
        const emailExists = await User.findOne({ email: email, _id: { $ne: user._id } });
        if (emailExists) { res.status(409); throw new Error('This email address is already in use by another account.'); }
        user.email = email;
    }
    user.name = name || user.name;
    const savedUser = await user.save();
    const updatedUser = await User.findById(savedUser._id).select('-passwordHash');
    res.status(200).json(updatedUser);
}));

// PUT /api/users/change-password
router.put('/change-password', protect, sanitizeRequestBody, asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) { res.status(400); throw new Error('Current and new passwords are required.'); }
    if (newPassword.length < 6) { res.status(400); throw new Error('New password must be at least 6 characters long.'); }
    const user = await User.findById(req.user._id);
    if (!user) { res.status(404); throw new Error('User not found.'); }
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) { res.status(401); throw new Error('Incorrect current password.'); }
    user.passwordHash = newPassword;
    await user.save();
    res.status(200).json({ message: 'Password updated successfully.' });
}));   

// --- CREATE A NEW USER ---
// POST /api/users
router.post('/', protect, isSuperAdmin, sanitizeRequestBody, asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
        res.status(400);
        throw new Error('Name, email, password, and role are required.');
    }
    const emailExists = await User.findOne({ email });
    if (emailExists) {
        res.status(409);
        throw new Error('A user with this email already exists.');
    }

    const newUser = new User({
        _id: `USR-${nanoid_user()}`,
        name,
        email,
        passwordHash: password,
        role
    });

    const createdUser = await newUser.save();
    res.status(201).json(createdUser);
}));

// --- UPDATE AN EXISTING USER ---
// PUT /api/users/:id
router.put('/:id', protect, isSuperAdmin, sanitizeRequestBody, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, email, password, role, status } = req.body;

    const user = await User.findById(id);
    if (!user) {
        res.status(404);
        throw new Error('User not found.');
    }

    if (user.role === 'Super Admin' && role && role !== 'Super Admin') {
        res.status(403);
        throw new Error('The Super Admin role cannot be changed.');
    }

    if (email && email !== user.email) {
        const emailExists = await User.findOne({ email, _id: { $ne: id } });
        if (emailExists) {
            res.status(409).json({ message: 'A user with this email already exists.' });
            return;
        }
        user.email = email;
    }
    
    user.name = name || user.name;
    if (password) {
        user.passwordHash = password;
    }
    if (role) user.role = role;
    if (status) user.status = status;

    const updatedUser = await user.save();
    res.status(200).json(updatedUser);
}));

// --- DELETE A USER ---
// DELETE /api/users/:id
router.delete('/:id', protect, isSuperAdmin, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
        res.status(404);
        throw new Error('User not found.');
    }

    if (user.role === 'Super Admin') {
        res.status(403);
        throw new Error('The Super Admin account cannot be deleted.');
    }

    await user.deleteOne();
    res.status(200).json({ message: 'User deleted successfully.' });
}));



module.exports = router;