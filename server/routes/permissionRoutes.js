// server/routes/permissionRoutes.js
const express = require('express');
const Permission = require('../models/Permission');
const asyncHandler = require('../utils/asyncHandler');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/permissions
// Fetches all available permissions. Protected route.
router.get('/', protect, asyncHandler(async (req, res) => {
    // We sort by _id to ensure a consistent order in the UI
    const permissions = await Permission.find({}).sort({ _id: 1 });
    res.status(200).json(permissions);
}));

module.exports = router;