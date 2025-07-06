const asyncHandler = require('express-async-handler');
const UserModel = require('../models/Users.js'); // Assuming the JS model file is named Users.js

/**
 * @description Get all users
 * @route       GET /api/users
 * @access      Private/Admin
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 */
const getUsers = asyncHandler(async (req, res) => {
    // .select('-password') ensures the hashed password is not sent back in the response
    const users = await UserModel.find({}).select('-password');
    res.json(users);
});


/**
 * @description Create a new user
 * @route       POST /api/users
 * @access      Private/Admin
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 */
const createUser = asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body;

    const userExists = await UserModel.findOne({ email });
    if (userExists) {
        res.status(400);
        throw new Error('User with that email already exists');
    }

    const user = await UserModel.create({ name, email, password, role });

    if (user) {
        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
        });
    } else {
        res.status(400);
        throw new Error('Invalid user data provided');
    }
});


/**
 * @description Update a user's profile
 * @route       PUT /api/users/:id
 * @access      Private/Admin
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 */
const updateUser = asyncHandler(async (req, res) => {
    const user = await UserModel.findById(req.params.id);

    if (user) {
        user.name = req.body.name || user.name;
        user.email = req.body.email || user.email;
        user.role = req.body.role || user.role;

        // Note: If you want to allow password updates, you need to handle it carefully.
        // Because the 'save' hook hashes the password, you can do this:
        if (req.body.password) {
            user.password = req.body.password;
        }

        const updatedUser = await user.save();

        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
        });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});


/**
 * @description Delete a user
 * @route       DELETE /api/users/:id
 * @access      Private/Admin
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 */
const deleteUser = asyncHandler(async (req, res) => {
    const user = await UserModel.findById(req.params.id);

    if (user) {
        // Mongoose v6+ uses `deleteOne()` on the document instance
        await user.deleteOne();
        res.json({ message: 'User removed successfully' });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});

// Export all the controller functions to be used in the routes file
module.exports = {
    getUsers,
    createUser,
    updateUser,
    deleteUser,
};