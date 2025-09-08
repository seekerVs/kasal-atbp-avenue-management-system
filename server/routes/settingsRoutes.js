const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const asyncHandler = require('../utils/asyncHandler');
const { protect } = require('../middleware/authMiddleware');

// GET /api/settings/public
router.get('/public', asyncHandler(async (req, res) => {
    const settings = await Settings.findById('shopSettings').lean();

    if (!settings) {
        // It's better to return empty strings than an error,
        // so the frontend doesn't break if settings aren't configured yet.
        return res.status(200).json({
            gcashName: '',
            gcashNumber: ''
        });
    }

    // Only expose the fields that are safe for the public to see.
    const publicSettings = {
        gcashName: settings.gcashName || '',
        gcashNumber: settings.gcashNumber || ''
    };
    
    res.status(200).json(publicSettings);
}));

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
    // 1. Destructure all possible settings from the request body.
    const { appointmentSlotsPerHour, gcashName, gcashNumber } = req.body;

    // 2. Build an update object dynamically to avoid overwriting fields with 'undefined'.
    const updateData = {};
    if (appointmentSlotsPerHour !== undefined) {
        if (typeof appointmentSlotsPerHour !== 'number' || appointmentSlotsPerHour < 0) {
            res.status(400);
            throw new Error('A valid, non-negative number for slots is required.');
        }
        updateData.appointmentSlotsPerHour = appointmentSlotsPerHour;
    }
    if (gcashName !== undefined) {
        updateData.gcashName = gcashName;
    }
    if (gcashNumber !== undefined) {
        updateData.gcashNumber = gcashNumber;
    }

    // 3. Find and update the settings document using the dynamically built object.
    const updatedSettings = await Settings.findByIdAndUpdate(
        'shopSettings',
        { $set: updateData },
        { new: true, upsert: true }
    );
    res.status(200).json(updatedSettings);
}));

module.exports = router;