const mongoose = require('mongoose');

// This schema will hold all global shop settings.
// We'll use a single document with a fixed ID for easy retrieval.
const SettingsSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: 'shopSettings', // Fixed ID for the single settings document
  },
  appointmentSlotsPerDay: {
    type: Number,
    required: true,
    default: 8, // A more sensible default for a full day
    min: 0,
  },
  gcashName: {
    type: String,
    trim: true,
    default: ''
  },
  gcashNumber: {
    type: String,
    trim: true,
    default: ''
  },
  shopAddress: {
    type: String,
    trim: true,
    default: 'N/A' // Add a sensible default
  },
  shopContactNumber: {
    type: String,
    trim: true,
    default: 'N/A'
  },
  shopEmail: {
    type: String,
    trim: true,
    default: 'N/A'
  },
}, { _id: false }); // Prevent Mongoose from creating its own ObjectId

module.exports = mongoose.model('Settings', SettingsSchema);