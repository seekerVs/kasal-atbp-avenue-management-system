const mongoose = require('mongoose');

// Define sub-schemas for organization
const HeroSchema = new mongoose.Schema({
  title: { type: String, default: 'Find your perfect outfit' },
  searchPlaceholder: { type: String, default: 'Dress color, type, or name' },
  imageUrl: { type: String, default: '' },
}, { _id: false });

const FeatureSchema = new mongoose.Schema({
  icon: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
}, { _id: false });

const ServiceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  text: { type: String, required: true },
  imageUrl: { type: String, required: true },
  path: { type: String, required: true },
}, { _id: false });

// ==========================================================
// --- THIS IS THE FIX ---
// Capitalize the 'S' in mongoose.Schema
// ==========================================================
const QualityCTASchema = new mongoose.Schema({ 
  title: { type: String, default: 'High Quality Outfits' },
  points: [String],
  buttonText: { type: String, default: 'Order Now' },
  imageUrl: { type: String, default: '' },
}, { _id: false });


// The main schema
const HomePageContentSchema = new mongoose.Schema({
  _id: { type: String, default: 'main_home_page' }, 
  hero: HeroSchema,
  features: [FeatureSchema],
  services: [ServiceSchema],
  qualityCTA: QualityCTASchema, // This will now use the valid schema
}, { timestamps: true });

module.exports = mongoose.model('HomePageContent', HomePageContentSchema);