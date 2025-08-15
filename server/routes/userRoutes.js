// server/routes/userRoutes.js

const express = require('express');
const User = require('../models/Users');
const Role = require('../models/Role'); // We need the Role model
const asyncHandler = require('../utils/asyncHandler');
const { protect } = require('../middleware/authMiddleware');
const { sanitizeRequestBody } = require('../middleware/sanitizeMiddleware');
const { customAlphabet } = require('nanoid');
const bcrypt = require('bcryptjs');

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

router.get('/me', protect, asyncHandler(async (req, res) => {
    // We use a nested populate to get the role AND the permissions within that role.
    const user = await User.findById(req.user._id)
      .select('-passwordHash')
      .populate({
        path: 'roleId',
        populate: {
          path: 'permissions',
          model: 'Permission'
        }
      });
      
    if (!user) {
        res.status(404);
        throw new Error('User not found.');
    }
    const userObject = user.toObject();
    userObject.role = userObject.roleId;
    delete userObject.roleId;
    res.status(200).json(userObject);
}));

// PUT /api/users/me - Allows a user to update their own name and email
router.put('/me', protect, sanitizeRequestBody, asyncHandler(async (req, res) => {
    const { name, email } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
        res.status(404);
        throw new Error('User not found.');
    }

    // Check if the new email is already taken by another user
    if (email && email !== user.email) {
        const emailExists = await User.findOne({ email: email, _id: { $ne: user._id } });
        if (emailExists) {
            res.status(409); // Conflict
            throw new Error('This email address is already in use by another account.');
        }
        user.email = email;
    }
    
    user.name = name || user.name;
    const savedUser = await user.save();
    
    // Repopulate to send back the full, updated object
    const updatedUser = await User.findById(savedUser._id).select('-passwordHash').populate({
        path: 'roleId',
        populate: { path: 'permissions', model: 'Permission' }
    });

    const userObject = updatedUser.toObject();
    userObject.role = userObject.roleId;
    delete userObject.roleId;

    res.status(200).json(userObject);
}));

// PUT /api/users/change-password - Allows a logged-in user to change their own password
router.put('/change-password', protect, sanitizeRequestBody, asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        res.status(400);
        throw new Error('Current and new passwords are required.');
    }
    if (newPassword.length < 6) {
        res.status(400);
        throw new Error('New password must be at least 6 characters long.');
    }

    // We need the full user document, including the password hash, for comparison
    const user = await User.findById(req.user._id);
    if (!user) {
        res.status(404); // Should not happen if token is valid, but good practice
        throw new Error('User not found.');
    }

    // Verify that the provided current password is correct
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
        res.status(401); // 401 Unauthorized
        throw new Error('Incorrect current password.');
    }

    // If correct, update the password. The pre-save hook will hash the new one.
    user.passwordHash = newPassword;
    await user.save();

    res.status(200).json({ message: 'Password updated successfully.' });
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