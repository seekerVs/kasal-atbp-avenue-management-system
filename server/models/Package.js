const mongoose = require('mongoose');

const PackageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  descripton: { type: String, default: null },
  inlusions: { type: [String], required: true },
  price: { type: Number, required: true },
  // --- NEW: Add the imageUrl field ---
  imageUrl: { type: String, required: true }, 
}, {
  timestamps: true,
});

const PackageModel = mongoose.model("packages", PackageSchema);
module.exports = PackageModel;