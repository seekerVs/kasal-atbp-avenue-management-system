// backend/models/Package.js
const mongoose = require('mongoose');

// NEW: Sub-schema for the new 'inclusions' array of objects
const InclusionSchema = new mongoose.Schema({
    wearerNum: { type: Number, required: true, min: 1 },
    name: { type: String, required: true },
    isCustom: { type: Boolean, default: false },
});

const AssignmentSchema = new mongoose.Schema({
    // It now links to a SINGLE inclusion.
    inclusionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Package.inclusions', required: true },
    // And can have MULTIPLE item IDs, one for each wearer in the inclusion.
    // 'null' is a valid value for a custom slot.
    itemIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'items', default: null }],

}, { _id: false });

const ColorMotifSchema = new mongoose.Schema({
    motifName: { type: String, required: true },
    assignments: [AssignmentSchema]
});

// UPDATED: The main PackageSchema
const PackageSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String },
    inclusions: [InclusionSchema], // Use the new sub-schema
    price: { type: Number, required: true },
    imageUrls: [String], // Changed from singular 'imageUrl' to plural array
    colorMotifs: [ColorMotifSchema]
}, { timestamps: true });

const PackageModel = mongoose.model("packages", PackageSchema);
module.exports = PackageModel;