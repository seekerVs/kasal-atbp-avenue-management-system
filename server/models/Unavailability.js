const mongoose = require('mongoose');

const UnavailabilitySchema = new mongoose.Schema({
  // We'll store the date at UTC midnight for easy day-based comparisons.
  date: { 
    type: Date, 
    required: true, 
    unique: true,
    index: true,
  },
  reason: { 
    type: String, 
    required: true,
    trim: true,
  },
  // This could be used later for half-day closures, but for now, we'll default to true.
  isFullDay: { 
    type: Boolean, 
    default: true 
  },
}, { 
  timestamps: true 
});

// To ensure dates are stored consistently at midnight without time information.
UnavailabilitySchema.pre('save', function(next) {
  if (this.date) {
    this.date.setUTCHours(0, 0, 0, 0);
  }
  next();
});

module.exports = mongoose.model("Unavailability", UnavailabilitySchema);