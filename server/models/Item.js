const mongoose = require('mongoose');

// Sub-schema for the nested variations array.
// Mongoose will automatically add a unique _id to each variation, which is what the frontend expects.
const VariationSchema = new mongoose.Schema({
  color: {
    name: { type: String, required: true },
    hex: { type: String, required: true },
  },
  size: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  imageUrl: { type: String, required: false },
});

// Main Schema for the 'items' collection
const ItemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  price: { type: Number, required: true },
  category: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  features: { type: [String] },
  composition: { type: [String] },
  variations: { type: [VariationSchema], required: true },
  heartCount: { type: Number, default: 0 },
  ageGroup: { 
    type: String, 
    enum: ['Adult', 'Kids'],
  },
  gender: { 
    type: String, 
    enum: ['Male', 'Female', 'Unisex'],
  },
}, {  
  timestamps: true,
});

const ItemModel = mongoose.model("items", ItemSchema);
module.exports = ItemModel;