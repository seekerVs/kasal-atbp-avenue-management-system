// server/models/ItemVariation.js
const mongoose = require('mongoose');

const ItemVariationSchema = new mongoose.Schema({
    dressId: { // This links back to the Item's _id
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Item', // Reference to the Item model
        required: true,
    },
    color: {
        type: String,
        required: [true, 'Color is required'],
        trim: true,
    },
    size: {
        type: String,
        required: [true, 'Size is required'],
        trim: true,
    },
    quantity: {
        type: Number,
        required: [true, 'Quantity is required'],
        min: [0, 'Quantity cannot be negative'],
        default: 0,
    },
    imageUrl: {
        type: String,
        trim: true,
        default: '', // Default to an empty string or a placeholder
    },
}, {
    timestamps: true,
});

const ItemVariationModel = mongoose.model("ItemVariation", ItemVariationSchema); // Singular 'ItemVariation'
module.exports = ItemVariationModel;