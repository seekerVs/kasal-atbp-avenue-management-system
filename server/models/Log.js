// server/models/Log.js

const mongoose = require('mongoose');

const LogSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  level: { type: String, required: true },
  message: { type: String, required: true },
  meta: { type: Object } // To store extra information like user ID, IP address, etc.
});

// Create a "Capped Collection" for logs.
// This is a special type of collection that has a fixed size. Once it's full,
// the oldest entries are automatically removed to make space for new ones.
// This prevents your database from filling up with old logs indefinitely.
LogSchema.set('capped', { size: 1024 * 1024 * 50, max: 5000 }); // e.g., 50MB or 50,000 documents

module.exports = mongoose.model('Log', LogSchema);