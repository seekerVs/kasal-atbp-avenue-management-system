const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// --- Mongoose Schema ---
// This defines the structure of the user document in the MongoDB 'users' collection.
const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a name']
    },
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        unique: true,
        // Regex for basic email validation
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please provide a valid email'
        ]
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: 6,
        select: false // This prevents the password from being returned in queries by default
    },
    role: {
        type: String,
        enum: ['Admin', 'User'], // Restricts the role field to only these two values
        default: 'User'
    },
}, {
    timestamps: true // Automatically adds `createdAt` and `updatedAt` fields
});


// --- Mongoose Middleware (a "pre-save" hook) ---
// This function runs automatically right BEFORE a document is saved to the database.
// We use it here to hash the password if it's new or has been changed.
UserSchema.pre('save', async function (next) {
    // We only want to hash the password if it's being created or modified.
    // If we don't include this check, the password would be re-hashed every time a user
    // updates their profile (e.g., changes their name), which would lock them out.
    if (!this.isModified('password')) {
        return next();
    }

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error); // Pass any errors to the next middleware
    }
});


// --- Mongoose Schema Method ---
// We attach a custom method to our schema. Any document created from this model
// will have access to this `matchPassword` function.
UserSchema.methods.matchPassword = async function (enteredPassword) {
    // `this.password` refers to the hashed password stored in the current user document.
    // `bcrypt.compare` securely hashes the `enteredPassword` and compares it to the stored hash.
    return await bcrypt.compare(enteredPassword, this.password);
};


// --- Mongoose Model ---
// We create the model from the schema. This is the object we'll use in our controllers
// to perform CRUD operations (e.g., UserModel.find(), UserModel.create()).
const UserModel = mongoose.model('User', UserSchema);


// --- Export ---
// We export the model so it can be used in other parts of our application (like controllers).
module.exports = UserModel;