// server/models/Reservation.js
const mongoose = require('mongoose');
const { 
  CustomerInfoSchema, 
  FinancialsSchema, 
  ItemReservationSchema, 
  PackageReservationSchema 
} = require('./schemas/sharedSchemas');

const ReservationSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  customerInfo: { type: CustomerInfoSchema, required: true },
  reserveDate: { type: Date, required: true },
  status: {
    type: String,
    required: true,
    enum: ['Pending', 'Confirmed', 'Completed', 'Cancelled'],
    default: 'Pending',
  },
  cancellationReason: { type: String, trim: true },
  rentalId: { type: String, ref: 'rentals', default: null },
  financials: { type: FinancialsSchema, default: {} },
  itemReservations: [ItemReservationSchema],
  packageReservations: [PackageReservationSchema],
  packageAppointmentDate: { 
    type: Date, 
    required: false 
  },
  // This new field will store the 'morning' or 'afternoon' string.
  packageAppointmentBlock: {
    type: String,
    required: false, // It's only required if there's a custom package item
    enum: ['morning', 'afternoon', null], // Allow null for reservations without appointments
  },
}, {
  timestamps: true,
  _id: false,
});

ReservationSchema.pre('save', function(next) {
  if (this.isModified('reserveDate') && this.reserveDate) {
    this.reserveDate.setUTCHours(0, 0, 0, 0);
  }
  // Also normalize the package appointment date
  if (this.isModified('packageAppointmentDate') && this.packageAppointmentDate) {
    this.packageAppointmentDate.setUTCHours(0, 0, 0, 0);
  }
  next();
});

// --- FIX: Index the correct 'reserveDate' field ---
ReservationSchema.index({ reserveDate: 1, status: 1 });
ReservationSchema.index({ "customerInfo.phoneNumber": 1 });

module.exports = mongoose.model("Reservation", ReservationSchema);