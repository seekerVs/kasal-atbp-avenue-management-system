// backend/models/Package.js
const mongoose = require('mongoose');

// NEW: Sub-schema for the new 'inclusions' array of objects
const InclusionSchema = new mongoose.Schema({
    wearerNum: { type: Number, required: true, min: 1 },
    name: { type: String, required: true },
    isCustom: { type: Boolean, default: false },
    type: {
        type: String,
        enum: ['Wearable', 'Accessory'], // A list of allowed types
        default: 'Wearable'
    }
});

const AssignedItemSchema = new mongoose.Schema({
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'items', required: true },
    color: {
        name: { type: String, required: true },
        hex: { type: String, required: true },
    },
    size: { type: String, required: true },
}, { _id: false });

const AssignmentSchema = new mongoose.Schema({
    // It now links to a SINGLE inclusion.
    inclusionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Package.inclusions', required: true },
    // And can have MULTIPLE item IDs, one for each wearer in the inclusion.
    // 'null' is a valid value for a custom slot.
    assignedItems: [{ type: AssignedItemSchema, default: null }],

}, { _id: false });

const ColorMotifSchema = new mongoose.Schema({
    motifHex: { type: String, required: true },
    assignments: [AssignmentSchema]
});

// UPDATED: The main PackageSchema
const PackageSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    description: { type: String },
    inclusions: [InclusionSchema], // Use the new sub-schema
    price: { type: Number, required: true },
    imageUrls: [String], // Changed from singular 'imageUrl' to plural array
    colorMotifs: {
      type: [ColorMotifSchema],
      validate: {
        validator: function(v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'A package must have at least one color motif defined.'
      }
    }
}, { timestamps: true });

const PackageModel = mongoose.model("packages", PackageSchema);
module.exports = PackageModel;