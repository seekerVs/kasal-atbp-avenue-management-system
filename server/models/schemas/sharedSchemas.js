// server/models/schemas/sharedSchemas.js
const mongoose = require('mongoose');

// --- Customer & Address Sub-Schema ---
const AddressSchema = new mongoose.Schema({
  province: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  barangay: { type: String, required: true, trim: true },
  street: { type: String, required: true, trim: true },
}, { _id: false });

const CustomerInfoSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, trim: true },
  phoneNumber: { type: String, required: true, trim: true },
  address: { type: AddressSchema, required: true },
}, { _id: false });

// --- Financials Sub-Schema ---
const PaymentSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  date: { type: Date, required: true },
  referenceNumber: { type: String, trim: true },
  receiptImageUrl: { type: String, trim: true }, 
}, { _id: false });

const FinancialsSchema = new mongoose.Schema({
  shopDiscount: { type: Number, default: 0 },
  depositAmount: { type: Number, default: 0 },
  requiredDeposit: { type: Number, default: 0 },
  payments: [PaymentSchema],
}, { _id: false });

// --- Reservations Sub-Schemas ---
const ItemReservationSchema = new mongoose.Schema({
  reservationId: { type: String, required: true },
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'items', required: true },
  itemName: { type: String, required: true, trim: true },
  variation: {
    // --- THIS IS THE MODIFIED BLOCK ---
    color: {
      name: { type: String, required: true },
      hex: { type: String, required: true },
    },
    // --- END OF MODIFICATION ---
    size: { type: String, required: true, trim: true },
  },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true },
}, { _id: false });

const FulfillmentPreviewSchema = new mongoose.Schema({
  role: { type: String, required: true, trim: true },
  wearerName: { type: String, trim: true },
  isCustom: { type: Boolean, default: false },
  assignedItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'items' },
  variation: { type: String },
  // If a custom role creates an appointment, we link it here
  linkedAppointmentId: { type: String, ref: 'Appointment', default: null },
  notes: { type: String, trim: true }
}, { _id: false });

const PackageReservationSchema = new mongoose.Schema({
  packageReservationId: { type: String, required: true },
  packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'packages', required: true },
  packageName: { type: String, required: true, trim: true },
  motifHex: { type: String, trim: true }, 
  price: { type: Number, required: true },
  fulfillmentPreview: [FulfillmentPreviewSchema],
}, { _id: false });

// --- Appointments Sub-Schemas ---
const ProcessedItemSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  notes: { type: String, trim: true },
  outfitCategory: { type: String, required: true, trim: true },
  outfitType: { type: String, required: true, trim: true },
  tailoringType: { type: String, required: true, enum: ['Tailored for Purchase', 'Tailored for Rent-Back'] },
  measurements: { type: Object, required: true },
  materials: { type: [String], required: true },
  designSpecifications: { type: String, required: true, trim: true },
  referenceImages: [String],
}, { _id: false });

module.exports = {
  AddressSchema,
    CustomerInfoSchema,
    FinancialsSchema,
    ItemReservationSchema,
    PackageReservationSchema,
    ProcessedItemSchema
};