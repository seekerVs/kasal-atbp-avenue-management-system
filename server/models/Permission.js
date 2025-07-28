// server/models/Permission.js
const mongoose = require('mongoose');

const PermissionSchema = new mongoose.Schema({
  _id: {
    type: String, // e.g., "manage_users"
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
}, { _id: false }); // Use our custom string _id

const PermissionModel = mongoose.model("Permission", PermissionSchema);
module.exports = PermissionModel;