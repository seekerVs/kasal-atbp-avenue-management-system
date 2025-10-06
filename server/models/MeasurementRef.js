// backend/models/MeasurementRef.js
const mongoose = require('mongoose');

// --- 1. DEFINE THE NEW SUB-SCHEMA for a single measurement detail ---
// We don't need a separate _id for each measurement in the array.
const MeasurementDetailSchema = new mongoose.Schema({
  label: {
    type: String,
    required: true,
    trim: true
  },
  guide: {
    type: String,
    required: true,
    trim: true
  }
}, { _id: false });


// --- 2. UPDATE THE MAIN SCHEMA to use the sub-schema ---
const MeasurementRefSchema = new mongoose.Schema({
  outfitName: {
    type: String,
    required: true,
    unique: true
  },
  category: {
    type: String,
    required: true
  },
  description: { // <-- ADDED new description field from your sample data
    type: String,
    trim: true
  },
  measurements: {
    type: [MeasurementDetailSchema], // <-- THIS IS THE KEY CHANGE
    required: true
  }
}, { timestamps: true });

const MeasurementRefModel = mongoose.model("measurementrefs", MeasurementRefSchema);
module.exports = MeasurementRefModel;