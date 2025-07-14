const mongoose = require('mongoose');

// The new, unified Page Schema
const PageSchema = new mongoose.Schema({
  slug: {
    type: String,
    required: true,
    unique: true,
    index: true, // For fast lookups
  },
  title: {
    type: String,
    required: true,
  },
  // By setting 'type: Object', we tell Mongoose that the 'content'
  // field can have any structure, making it flexible enough for
  // both the home page and the about page.
  content: {
    type: Object,
    required: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Page', PageSchema);