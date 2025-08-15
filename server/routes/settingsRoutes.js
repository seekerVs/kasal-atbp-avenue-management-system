const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const asyncHandler = require('../utils/asyncHandler');
const { protect } = require('../middleware/authMiddleware');

// GET /api/settings - Fetches the shop settings document
router.get('/', protect, asyncHandler(async (req, res) => {
    // Find the single settings document, or create it with defaults if it doesn't exist.
    const settings = await Settings.findOneAndUpdate(
        { _id: 'shopSettings' },
        { $setOnInsert: { _id: 'shopSettings' } }, // Only set on creation
        { new: true, upsert: true }
    );
    res.status(200).json(settings);
}));

// PUT /api/settings - Updates the shop settings
router.put('/', protect, asyncHandler(async (req, res) => {
    const { appointmentSlotsPerHour } = req.body;
    if (typeof appointmentSlotsPerHour !== 'number' || appointmentSlotsPerHour < 0) {
        res.status(400);
        throw new Error('A valid, non-negative number for slots is required.');
    }

    const updatedSettings = await Settings.findByIdAndUpdate(
        'shopSettings',
        { $set: { appointmentSlotsPerHour } },
        { new: true, upsert: true }
    );
    res.status(200).json(updatedSettings);
}));

module.exports = router;