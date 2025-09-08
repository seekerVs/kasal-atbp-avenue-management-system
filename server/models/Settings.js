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
}, { _id: false }); // Prevent Mongoose from creating its own ObjectId

module.exports = mongoose.model('Settings', SettingsSchema);