// server/models/Appointment.js
const mongoose = require('mongoose');
const { CustomerInfoSchema } = require('./schemas/sharedSchemas');

const AppointmentSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  customerInfo: { type: CustomerInfoSchema, required: true },
  appointmentDate: { type: Date, required: true },
  
  // --- NEW FIELD ADDED ---
  timeBlock: {
    type: String,
    required: true,
    enum: ['morning', 'afternoon'],
  },

  status: {
    type: String,
    required: true,
    enum: ['Pending', 'Confirmed', 'Completed', 'Cancelled'],
    default: 'Pending',
  },
  notes: { type: String, trim: true },
  cancellationReason: { type: String, trim: true },
  rentalId: { type: String, ref: 'rentals', default: null },
  sourceReservationId: { type: String, ref: 'Reservation', default: null }, 
}, {
  timestamps: true,
  _id: false,
});

// --- NEW pre-save HOOK TO NORMALIZE THE DATE ---
// This ensures that the time part of the appointmentDate is always
// set to UTC midnight, making the date pure and removing ambiguity.
AppointmentSchema.pre('save', function(next) {
  if (this.isModified('appointmentDate') && this.appointmentDate) {
    this.appointmentDate.setUTCHours(0, 0, 0, 0);
  }
  next();
});


AppointmentSchema.index({ appointmentDate: 1, status: 1 });
AppointmentSchema.index({ "customerInfo.phoneNumber": 1 });

module.exports = mongoose.model("Appointment", AppointmentSchema);