// Users.js (Mongoose Schema)
const mongoose = require('mongoose');

const UsersSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/.+@.+\..+/, 'Please enter a valid email address'],
    },
    age: {
        type: Number,
        required: [true, 'Age is required'],
        min: [0, 'Age cannot be negative'],
        max: [120, 'Age seems too high'],
    },
    // Add a password field for authentication
    password: { // IMPORTANT: Passwords should ALWAYS be hashed before saving to DB
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters long'],
        // select: false // Consider adding this to prevent password from being returned in queries by default
    }
}, {
    timestamps: true,
});

const UserModel = mongoose.model("users", UsersSchema);
module.exports = UserModel;