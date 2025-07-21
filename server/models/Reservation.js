// backend/models/Reservation.js
const mongoose = require('mongoose');

// --- Sub-Schemas for Organization ---
const AddressSchema = new mongoose.Schema({
    province: { type: String, required: true },
    city: { type: String, required: true },
    barangay: { type: String, required: true },
    street: { type: String, required: true },
}, { _id: false });

const CustomerInfoSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String },
    phoneNumber: { type: String, required: true },
    address: { type: AddressSchema, required: true },
}, { _id: false });

const PaymentSchema = new mongoose.Schema({
    amount: { type: Number, required: true },
    date: { type: Date, required: true },
    method: { type: String, enum: ['Cash', 'GCash', 'Bank Transfer'], required: true },
    referenceNumber: { type: String },
}, { _id: false });

const FinancialsSchema = new mongoose.Schema({
    shopDiscount: { type: Number, default: 0 },
    depositAmount: { type: Number, default: 0 },
    payments: [PaymentSchema],
}, { _id: false });

const ItemReservationSchema = new mongoose.Schema({
    reservationId: { type: String, required: true },
    status: { type: String, required: true, default: 'Reserved' },
    statusNote: { type: String },
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'items', required: true },
    itemName: { type: String, required: true },
    variation: { 
        color: { type: String, required: true },
        size: { type: String, required: true },
    },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
}, { _id: false });

const FulfillmentPreviewSchema = new mongoose.Schema({
    role: { type: String, required: true },
    wearerName: { type: String },
    isCustom: { type: Boolean, required: true },
    assignedItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'items' },
    variation: { type: String },
}, { _id: false });

const PackageReservationSchema = new mongoose.Schema({
    packageReservationId: { type: String, required: true },
    status: { type: String, required: true, default: 'Reserved' },
    statusNote: { type: String },
    packageId: { type: mongoose.Schema.Types.ObjectId, ref: 'packages', required: true },
    packageName: { type: String, required: true },
    motifName: { type: String },
    price: { type: Number, required: true },
    fulfillmentPreview: [FulfillmentPreviewSchema],
}, { _id: false });

const CustomTailoringItemSchema = require('./Rental').schema.path('customTailoring').schema.obj[0];

const AppointmentSchema = new mongoose.Schema({
    appointmentId: { type: String, required: true },
    status: { type: String, required: true, enum: ['Pending', 'Confirmed', 'Completed', 'Cancelled'], default: 'Pending' },
    statusNote: { type: String },
    appointmentFor: {
        sourcePackageReservationId: { type: String },
        role: { type: String, required: true },
    },
    appointmentDate: { type: Date },
    processedItemData: { type: CustomTailoringItemSchema, default: null },
}, { _id: false });

// --- Main Reservation Schema ---
const ReservationSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    customerInfo: { type: CustomerInfoSchema, required: true },
    eventDate: { type: Date, required: true },
    rentalStartDate: { type: Date, required: true },
    rentalEndDate: { type: Date, required: true },
    rentalId: { type: String, ref: 'rentals', default: null },
    financials: { type: FinancialsSchema, default: {} },
    itemReservations: [ItemReservationSchema],
    packageReservations: [PackageReservationSchema],
    appointments: [AppointmentSchema],
}, {
    timestamps: true,
    _id: false, // Use our custom string _id
});

module.exports = mongoose.model("Reservation", ReservationSchema);