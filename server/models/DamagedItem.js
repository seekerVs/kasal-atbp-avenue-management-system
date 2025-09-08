const mongoose = require('mongoose');

const DamagedItemSchema = new mongoose.Schema({
  // --- Core Item Information ---
  itemId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'items', // Direct reference to the original item in the 'items' collection
    required: true 
  },
  itemName: { 
    type: String, 
    required: true, 
    trim: true 
  },
  variation: { 
    type: String, // Stored as a simple string, e.g., "Red, M" or "Champagne, L"
    required: true, 
    trim: true 
  },
  imageUrl: {
    type: String, // Denormalized for easy display in the damaged items list
    trim: true
  },

  // --- Context of the Damage ---
  rentalId: { 
    type: String, 
    ref: 'rentals', // Reference to the rental where the damage occurred
    required: true 
  },
  quantity: { 
    type: Number, 
    required: true, 
    min: 1 
  },
  damageReason: { 
    type: String, 
    required: true,
    trim: true
  },
  damageNotes: { 
    type: String,
    trim: true
  },

  // --- Status for Repair/Disposal Workflow ---
  status: {
    type: String,
    required: true,
    enum: ['Awaiting Repair', 'Under Repair', 'Repaired', 'Disposed'],
    default: 'Awaiting Repair'
  }
}, { 
  timestamps: true // Adds createdAt and updatedAt fields automatically
});

// Add an index on status for efficient querying on the new admin page
DamagedItemSchema.index({ status: 1 });

const DamagedItemModel = mongoose.model('DamagedItem', DamagedItemSchema);
module.exports = DamagedItemModel;