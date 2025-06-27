const mongoose = require('mongoose');

// Sub-schema for the nested variation object inside an item
const ItemVariationSchema = new mongoose.Schema({
  color: { type: String, required: true },
  size: { type: String, required: true },
  imageUrl: { type: String, required: true },
}, { _id: false }); // Prevents Mongoose from adding an _id to variation sub-documents

// Sub-schema for the items array
const RentedItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  variation: { type: ItemVariationSchema, required: true },
  notes: { type: String, trim: true },
}, { _id: false }); // Prevents Mongoose from adding an _id to item sub-documents

// Sub-schema for the customerInfo array
const CustomerInfoSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  address: { type: String, required: true },
}, { _id: false }); // Prevents Mongoose from adding an _id to customer sub-documents

// Main Rental Schema
const RentalSchema = new mongoose.Schema({
  // We explicitly define _id as a String to handle both custom IDs (e.g., "rental_003")
  // and newly generated ones (e.g., "rent_j7sYt9a").
  _id: {
    type: String,
    required: true,
  },
  customerInfo: {
    type: [CustomerInfoSchema],
    required: true,
  },
  items: {
    type: [RentedItemSchema],
    required: true,
  },
  // Switched to Number for easier calculations on the backend and frontend.
  shopDiscount: {
    type: Number,
    required: true,
    default: 0,
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'Gcash'], 
    default: 'Cash',
  },
  gcashRefNum: { 
    type: String, 
    default: "" 
  },
  cashTendered: { 
    type: Number, 
    default: 0 
  },
  rentalStartDate: {
    type: String, // Storing as YYYY-MM-DD string
    required: true,
  },
  rentalEndDate: {
    type: String, // Storing as YYYY-MM-DD string
    required: true,
  },
  status: {
    type: String,
    required: true,
    enum: ['To Process', 'To Return', 'Returned', 'Cancelled', 'Completed'], // Enforces valid status values.
    default: 'To Process',
  },
}, {
  // Adds createdAt and updatedAt fields automatically to each document.
  timestamps: true,
  // This critical option tells Mongoose not to generate its own default ObjectId,
  // because we are providing our own string-based _id above.
  _id: false, 
});

const RentalModel = mongoose.model("rentals", RentalSchema);
module.exports = RentalModel;