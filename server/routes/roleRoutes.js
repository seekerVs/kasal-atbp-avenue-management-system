// server/routes/roleRoutes.js
const express = require('express');
const { customAlphabet } = require('nanoid');
const Role = require('../models/Role');
const asyncHandler = require('../utils/asyncHandler');
const { protect } = require('../middleware/authMiddleware');
const { sanitizeRequestBody } = require('../middleware/sanitizeMiddleware');

const router = express.Router();

const nanoid_role = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 6);

// GET /api/roles - Fetch all roles
router.get('/', protect, asyncHandler(async (req, res) => {
    const roles = await Role.find({}).sort({ name: 1 });
    res.status(200).json(roles);
}));

// POST /api/roles - Create a new role
router.post('/', protect, sanitizeRequestBody, asyncHandler(async (req, res) => {
    const { name, permissions } = req.body;
    if (!name) {
        res.status(400);
        throw new Error('Role name is required.');
    }

    const roleExists = await Role.findOne({ name });
    if (roleExists) {
        res.status(409); // Conflict
        throw new Error('A role with this name already exists.');
    }

    const newRole = new Role({
        _id: `role_${nanoid_role()}`,
        name,
        permissions: permissions || [],
    });

    const savedRole = await newRole.save();
    res.status(201).json(savedRole);
}));

// PUT /api/roles/:id - Update an existing role
router.put('/:id', protect, sanitizeRequestBody, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, permissions } = req.body;

    const role = await Role.findById(id);
    if (!role) {
        res.status(404);
        throw new Error('Role not found.');
    }

    // Check if the new name is already taken by another role
    if (name) {
        const roleExists = await Role.findOne({ name: name, _id: { $ne: id } });
        if (roleExists) {
            res.status(409);
            throw new Error('A role with this name already exists.');
        }
        role.name = name;
    }
    
    // permissions can be an empty array
    if (permissions !== undefined) {
        role.permissions = permissions;
    }

    const updatedRole = await role.save();
    res.status(200).json(updatedRole);
}));

// DELETE /api/roles/:id - Delete a role
router.delete('/:id', protect, asyncHandler(async (req, res) => {
    const { id } = req.params;

    const role = await Role.findById(id);
    if (!role) {
        res.status(404);
        throw new Error('Role not found.');
    }

    // Optional: Add logic here to check if any users are currently assigned this role before allowing deletion.
    // For now, we will proceed with deletion.

    await role.deleteOne();
    res.status(200).json({ message: 'Role deleted successfully.' });
}));


module.exports = router;