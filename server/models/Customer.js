// server/models/Customer.js
const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Customer name is required'],
        trim: true,
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
    },
    contact: {
        type: String,
        required: [true, 'Customer contact number is required'],
        trim: true,
    },
    address: {
        type: String,
        trim: true,
    },
}, {
    timestamps: true,
});

// --- THIS IS THE CRUCIAL LINE ---
const CustomerModel = mongoose.model("Customer", CustomerSchema); // Registered as "Customer"
module.exports = CustomerModel;