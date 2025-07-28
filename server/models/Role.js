// server/models/Role.js
const mongoose = require('mongoose');

const RoleSchema = new mongoose.Schema({
  _id: {
    type: String, // e.g., "super-admin", "staff"
    required: true,
  },
  name: {
    type: String,
    required: true,
    unique: true,
  },
  permissions: [{
    type: String,
    ref: 'Permission', // References the Permission model
  }],
}, { 
  timestamps: true,
  _id: false,
});

const RoleModel = mongoose.model("Role", RoleSchema);
module.exports = RoleModel;