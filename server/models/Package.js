// backend/models/Package.js
const mongoose = require('mongoose');

const AssignmentSchema = new mongoose.Schema({
    role: { type: String, required: true },
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'items' },
    assignedItemName: { type: String },
    variation: { type: String }, // e.g., "Color, Size"
    imageUrl: { type: String },
    isCustom: { type: Boolean, default: false },
}, { _id: false });

const ColorMotifSchema = new mongoose.Schema({
    motifName: { type: String, required: true },
    assignments: [AssignmentSchema]
});

const PackageSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String },
    inclusions: [String],
    price: { type: Number, required: true },
    imageUrl: { type: String},
    colorMotifs: [ColorMotifSchema]
}, { timestamps: true });

const PackageModel = mongoose.model("packages", PackageSchema);
module.exports = PackageModel;