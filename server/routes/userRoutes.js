// server/routes/userRoutes.js

const express = require('express');
const User = require('../models/Users');
const Role = require('../models/Role'); // We need the Role model
const asyncHandler = require('../utils/asyncHandler');
const { protect } = require('../middleware/authMiddleware');
const { sanitizeRequestBody } = require('../middleware/sanitizeMiddleware');
const { customAlphabet } = require('nanoid');

const router = express.Router();

const nanoid_user = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 6);

// --- GET ALL USERS (WITH ROLE POPULATED) ---
// GET /api/users
router.get('/', protect, asyncHandler(async (req, res) => {
    // .populate('roleId') is the key change.
    // It tells Mongoose to look up the roleId in the 'roles' collection
    // and replace it with the full role document.
    const users = await User.find({}).populate('roleId').sort({ name: 1 });
    
    // We will rename 'roleId' to 'role' in the response for frontend convenience.
    const transformedUsers = users.map(user => {
        const userObject = user.toObject();
        userObject.role = userObject.roleId; // Rename roleId to role
        delete userObject.roleId;
        return userObject;
    });

    res.status(200).json(transformedUsers);
}));

// --- CREATE A NEW USER ---
// POST /api/users
router.post('/', protect, sanitizeRequestBody, asyncHandler(async (req, res) => {
    const { name, email, password, roleId } = req.body;

    if (!name || !email || !password || !roleId) {
        res.status(400);
        throw new Error('Name, email, password, and role are required.');
    }
    const emailExists = await User.findOne({ email });
    if (emailExists) {
        res.status(409); // 409 Conflict
        throw new Error('A user with this email already exists.');
    }
    const roleExists = await Role.findById(roleId);
    if (!roleExists) {
        res.status(400);
        throw new Error('The selected role does not exist.');
    }

    const newUser = new User({
        _id: `USR-${nanoid_user()}`,
        name,
        email,
        passwordHash: password,
        roleId
    });

    await newUser.save();

    const createdUser = await User.findById(newUser._id).populate('roleId');

    const userObject = createdUser.toObject();
    userObject.role = userObject.roleId; // Rename roleId to role
    delete userObject.roleId;           // Clean up the old field

    res.status(201).json(userObject);
}));

// --- UPDATE AN EXISTING USER ---
// PUT /api/users/:id
router.put('/:id', protect, sanitizeRequestBody, asyncHandler(async (req, res) => {
    const { id } = req.params;
    // --- ADD 'status' to the destructuring ---
    const { name, email, password, roleId, status } = req.body;

    const user = await User.findById(id);
    if (!user) {
        res.status(404);
        throw new Error('User not found.');
    }

    // ... email conflict check ...
    
    // Update fields if provided
    user.name = name || user.name;
    user.email = email || user.email;
    if (password) {
        user.passwordHash = password;
    }
    if (roleId) {
        const roleExists = await Role.findById(roleId);
        if (!roleExists) {
            res.status(400);
            throw new Error('The selected role does not exist.');
        }
        user.roleId = roleId;
    }
    // --- ADD THIS BLOCK to handle status updates ---
    if (status) {
        // This relies on the enum in your Mongoose schema for validation
        user.status = status;
    }

    await user.save();
    
    const updatedUser = await User.findById(id).populate('roleId');
    const userObject = updatedUser.toObject();
    userObject.role = userObject.roleId;
    delete userObject.roleId;

    res.status(200).json(userObject);
}));

// --- DELETE A USER ---
// DELETE /api/users/:id
router.delete('/:id', protect, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
        res.status(404);
        throw new Error('User not found.');
    }
    
    // Optional: Add logic to prevent deletion of the last super-admin user.

    await user.deleteOne();
    res.status(200).json({ message: 'User deleted successfully.' });
}));


module.exports = router;