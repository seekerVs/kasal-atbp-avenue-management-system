const mongoose = require('mongoose');

// This schema will hold all global shop settings.
// We'll use a single document with a fixed ID for easy retrieval.
const SettingsSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: 'shopSettings', // Fixed ID for the single settings document
  },
  appointmentSlotsPerHour: {
    type: Number,
    required: true,
    default: 2,
    min: 0,
  },
}, { _id: false }); // Prevent Mongoose from creating its own ObjectId

module.exports = mongoose.model('Settings', SettingsSchema);