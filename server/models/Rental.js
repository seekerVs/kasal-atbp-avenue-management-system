// backend/models/Rental.js
const mongoose = require('mongoose');
const { AddressSchema } = require('./schemas/sharedSchemas');


// --- SUB-SCHEMAS ---
const CustomerInfoSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String },
  phoneNumber: { type: String, required: true },
  address: { type: AddressSchema, required: true },
}, { _id: false });

const SingleRentItemSchema = new mongoose.Schema({
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'items', // Direct reference to the original inventory item
    required: true,
  },
  name: { type: String, required: true }, // Now just the product name, e.g., "Champagne Dreams Ball Gown"
  variation: {
    type: {
      color: {
        name: { type: String, required: true },
        hex: { type: String, required: true },
      },
      size: { type: String, required: true },
    },
    required: true,
    _id: false, // Don't create a separate _id for the variation sub-object
  },
  price: { type: Number, required: true }, // Denormalized for historical accuracy
  quantity: { type: Number, required: true },
  imageUrl: { type: String }, // Denormalized for performance
  notes: { type: String },
});

const AssignedItemSchema = new mongoose.Schema({
  itemId: { type: String }, // Can be ObjectId string or custom string
  name: { type: String },
  variation: { type: String },
  imageUrl: { type: String },
}, { _id: false });

const PackageFulfillmentSchema = new mongoose.Schema({
  role: { type: String, required: true },
  wearerName: { type: String },
  assignedItem: { type: AssignedItemSchema, default: {} },
  isCustom: { type: Boolean, default: false },
}, { _id: false });

const PackageRentItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, default: 1 },
  imageUrl: { type: String },
  notes: { type: String },
  packageFulfillment: { type: [PackageFulfillmentSchema] },
});

const CustomTailoringItemSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, default: 1 },
  notes: { type: String },
  outfitCategory: { type: String, required: true },
  outfitType: { type: String, required: true },
  tailoringType: {
    type: String,
    required: true,
    enum: ['Tailored for Purchase', 'Tailored for Rent-Back'],
  },
  measurements: { type: Object },
  materials: { type: [String] },
  designSpecifications: { type: String },
  referenceImages: { type: [String] },
}, { _id: false });

// NEW: Schema for detailed payment info
const PaymentDetailSchema = new mongoose.Schema({
    amount: { type: Number, required: true, default: 0 },
    date: { type: Date },
    referenceNumber: { type: String, default: null }
}, { _id: false });

// UPDATED: Financials schema to use the new payment details
const FinancialsSchema = new mongoose.Schema({
  shopDiscount: { type: Number, default: 0 },
  depositAmount: { type: Number, default: 0 },
  downPayment: { type: PaymentDetailSchema },
  finalPayment: { type: PaymentDetailSchema },
  depositReimbursed: { type: Number, default: 0 },
}, { _id: false });

// --- MAIN RENTAL SCHEMA ---
const RentalSchema = new mongoose.Schema({
  _id: { // <-- MAJOR CHANGE #1
    type: String,
    required: true,
  },
  customerInfo: {
    type: [CustomerInfoSchema],
    required: true,
  },
  singleRents: [SingleRentItemSchema],
  packageRents: [PackageRentItemSchema],
  customTailoring: [CustomTailoringItemSchema],
  financials: { // <-- MAJOR CHANGE #2
    type: FinancialsSchema, 
    required: true 
  },
  rentalStartDate: { type: String, required: true },
  rentalEndDate: { type: String, required: true },
  status: {
    type: String,
    required: true,
    enum: ['To Process', 'To Pickup', 'To Return', 'Returned', 'Completed', 'Cancelled'],
    default: 'To Process',
  },
}, {
  timestamps: true,
  _id: false, // <-- Crucial for using custom string _id
});

const RentalModel = mongoose.model("rentals", RentalSchema);
module.exports = RentalModel;