// server/models/Appointment.js
const mongoose = require('mongoose');
const { CustomerInfoSchema, ProcessedItemSchema } = require('./schemas/sharedSchemas');

const AppointmentSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  customerInfo: { type: CustomerInfoSchema, required: true },
  // No change needed here, as 'Date' type already stores date and time.
  // The frontend change will be what sends the full timestamp.
  appointmentDate: { type: Date, required: true },
  status: {
    type: String,
    required: true,
    // --- THIS IS THE KEY CHANGE ---
    // Add 'Confirmed' and 'No Show' to the list of allowed values.
    enum: ['Pending', 'Confirmed', 'Completed', 'Cancelled', 'No Show'],
    default: 'Pending',
  },
  statusNote: { type: String, trim: true },
  rentalId: { type: String, ref: 'rentals', default: null },
  processedItemData: { type: ProcessedItemSchema, default: null },
  sourceReservationId: { type: String, ref: 'Reservation', default: null }, 
}, {
  timestamps: true,
  _id: false,
});

AppointmentSchema.index({ appointmentDate: 1, status: 1 });
AppointmentSchema.index({ "customerInfo.phoneNumber": 1 });

module.exports = mongoose.model("Appointment", AppointmentSchema);