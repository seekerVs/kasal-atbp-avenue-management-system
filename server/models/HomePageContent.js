const mongoose = require('mongoose');

// Define sub-schemas for organization
const HeroSchema = new mongoose.Schema({
  title: { type: String, default: 'Find your perfect outfit' },
  searchPlaceholder: { type: String, default: 'Dress color, type, or name' },
  imageUrl: { type: String, default: '/path/to/your/default/store_1.jpg' },
}, { _id: false });

const FeatureSchema = new mongoose.Schema({
  icon: { type: String, required: true }, // Store the icon name as a string
  title: { type: String, required: true },
  description: { type: String, required: true },
}, { _id: false });

const ServiceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  text: { type: String, required: true },
  imageUrl: { type: String, required: true },
  path: { type: String, required: true }, // e.g., '/products'
}, { _id: false });

const QualityCTASchema = new mongoose.Schema({
  title: { type: String, default: 'High Quality Outfits' },
  points: [String], // An array of strings like ['Maintained regularly', ...]
  buttonText: { type: String, default: 'Order Now' },
  imageUrl: { type: String, default: '/path/to/default/hanging_clothes.jpg' },
}, { _id: false });


// The main schema
const HomePageContentSchema = new mongoose.Schema({
  // Use a fixed, known ID so we can always fetch this single document easily
  _id: { type: String, default: 'main_home_page' }, 
  hero: HeroSchema,
  features: [FeatureSchema],
  services: [ServiceSchema],
  qualityCTA: QualityCTASchema,
}, { timestamps: true });

module.exports = mongoose.model('HomePageContent', HomePageContentSchema);