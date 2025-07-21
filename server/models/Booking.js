const mongoose = require('mongoose');

// ===================================================================================
// --- SUB-SCHEMAS (for nesting within the main Booking document) ---
// ===================================================================================

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
  method: { type: String, required: true, enum: ['Cash', 'GCash', 'Bank Transfer'] },
  referenceNumber: { type: String, trim: true },
}, { _id: false });

const FinancialsSchema = new mongoose.Schema({
  shopDiscount: { type: Number, default: 0 },
  depositAmount: { type: Number, default: 0 },
  payments: [PaymentSchema],
}, { _id: false });

// --- Reservations Sub-Schemas ---
const ItemReservationSchema = new mongoose.Schema({
  reservationId: { type: String, required: true, unique: true },
  status: { type: String, required: true, enum: ['Reserved', 'Confirmed', 'Cancelled'], default: 'Reserved' },
  statusNote: { type: String, trim: true },
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'items', required: true },
  itemName: { type: String, required: true, trim: true },
  variation: {
    color: { type: String, required: true, trim: true },
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
}, { _id: false });

const PackageReservationSchema = new mongoose.Schema({
  packageReservationId: { type: String, required: true, unique: true },
  status: { type: String, required: true, enum: ['Reserved', 'Confirmed', 'Cancelled'], default: 'Reserved' },
  statusNote: { type: String, trim: true },
  packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'packages', required: true },
  packageName: { type: String, required: true, trim: true },
  motifName: { type: String, trim: true },
  price: { type: Number, required: true },
  fulfillmentPreview: [FulfillmentPreviewSchema],
}, { _id: false });

// --- Appointments Sub-Schemas ---
const AppointmentForSchema = new mongoose.Schema({
  sourcePackageReservationId: { type: String },
  role: { type: String, required: true, trim: true },
}, { _id: false });

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

const AppointmentSchema = new mongoose.Schema({
  appointmentId: { type: String, required: true, unique: true },
  status: { type: String, required: true, enum: ['Pending', 'Scheduled', 'Completed', 'Cancelled'], default: 'Pending' },
  statusNote: { type: String, trim: true },
  appointmentFor: { type: AppointmentForSchema, required: true },
  appointmentDate: { type: Date },
  processedItemData: { type: ProcessedItemSchema, default: null },
}, { _id: false });


// ===================================================================================
// --- MAIN BOOKING SCHEMA ---
// ===================================================================================
const BookingSchema = new mongoose.Schema({
  _id: { // We define our own custom string ID
    type: String,
    required: true
  },
  customerInfo: { type: CustomerInfoSchema, required: true },
  eventDate: { type: Date, required: true },
  rentalStartDate: { type: Date, required: true },
  rentalEndDate: { type: Date, required: true },
  rentalId: { // This links to a finalized rental document later
    type: String,
    ref: 'rentals',
    default: null,
  },
  status: {
    type: String,
    required: true,
    enum: ['Pending', 'Confirmed', 'Completed', 'Cancelled'],
    default: 'Pending',
  },
  financials: { type: FinancialsSchema, default: {} },
  itemReservations: [ItemReservationSchema],
  packageReservations: [PackageReservationSchema],
  appointments: [AppointmentSchema],
}, {
  timestamps: true, // Manages `createdAt` and `updatedAt` fields automatically
  _id: false,       // Disables Mongoose's default ObjectId for the main document
});

// To improve performance on common queries
BookingSchema.index({ eventDate: 1, status: 1 });
BookingSchema.index({ "customerInfo.phoneNumber": 1 });

module.exports = mongoose.model("Booking", BookingSchema);