const mongoose = require('mongoose');

const UnavailabilitySchema = new mongoose.Schema({
  date: { 
    type: Date, 
    required: true, 
    unique: true,
    index: true,
  },
  reason: { 
    type: String, 
    required: true,
    enum: ['Public Holiday', 'Shop Holiday'], // Only these two reasons are allowed
  },
}, { 
  timestamps: true 
});

UnavailabilitySchema.pre('save', function(next) {
  if (this.isModified('date') && this.date) {
    this.date.setUTCHours(0, 0, 0, 0);
  }
  next();
});

module.exports = mongoose.model("Unavailability", UnavailabilitySchema);