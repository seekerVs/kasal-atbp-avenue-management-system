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
  eventDate: { type: Date, required: true },
  reserveStartDate: { type: Date, required: true },
  reserveEndDate: { type: Date, required: true },
  status: {
    type: String,
    required: true,
    enum: ['Pending', 'Confirmed', 'Completed', 'Cancelled'],
    default: 'Pending',
  },
  rentalId: { type: String, ref: 'rentals', default: null },
  financials: { type: FinancialsSchema, default: {} },
  itemReservations: [ItemReservationSchema],
  packageReservations: [PackageReservationSchema],
}, {
  timestamps: true,
  _id: false,
});

ReservationSchema.index({ eventDate: 1, status: 1 });
ReservationSchema.index({ "customerInfo.phoneNumber": 1 });

module.exports = mongoose.model("Reservation", ReservationSchema);