// backend/models/MeasurementRef.js
const mongoose = require('mongoose');

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
  measurements: {
    type: [String],
    required: true
  }
}, { timestamps: true });

const MeasurementRefModel = mongoose.model("measurementrefs", MeasurementRefSchema);
module.exports = MeasurementRefModel;