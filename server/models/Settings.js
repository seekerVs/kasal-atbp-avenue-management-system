const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: 'shopSettings',
  },
  appointmentSlotsPerDay: {
    type: Number,
    required: true,
    default: 8,
    min: 0,
  },
  gcashName: { type: String, trim: true, default: '' },
  gcashNumber: { type: String, trim: true, default: '' },
  shopAddress: { type: String, trim: true, default: 'N/A' },
  shopContactNumber: { type: String, trim: true, default: 'N/A' },
  shopEmail: { type: String, trim: true, default: 'N/A' },

  ownerName: { type: String, trim: true, default: '' },
  ownerTIN: { type: String, trim: true, default: '' },
  accreditationNumber: { type: String, trim: true, default: '' },
  accreditationDate: { type: Date, default: null },
  paymentTerms: { type: String, trim: true, default: 'Cash' },
  businessStyle: { type: String, trim: true, default: 'Service' },

}, { _id: false });

module.exports = mongoose.model('Settings', SettingsSchema);