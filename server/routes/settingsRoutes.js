const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const asyncHandler = require('../utils/asyncHandler');
const { protect } = require('../middleware/authMiddleware');

// GET /api/settings/public
router.get('/public', asyncHandler(async (req, res) => {
    const settings = await Settings.findById('shopSettings').lean();

    const defaults = {
        gcashName: '',
        gcashNumber: '',
        shopAddress: '',
        shopContactNumber: '',
        shopEmail: ''
    };

    if (!settings) {
        return res.status(200).json(defaults);
    }
    
    // Expose all necessary public fields, with fallbacks.
    const publicSettings = {
        gcashName: settings.gcashName || defaults.gcashName,
        gcashNumber: settings.gcashNumber || defaults.gcashNumber,
        shopAddress: settings.shopAddress || defaults.shopAddress,
        shopContactNumber: settings.shopContactNumber || defaults.shopContactNumber,
        shopEmail: settings.shopEmail || defaults.shopEmail
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
    // Destructure all possible settings from the request body.
    const { 
        appointmentSlotsPerDay, 
        gcashName, 
        gcashNumber,
        shopAddress,
        shopContactNumber,
        shopEmail,
        // --- NEW FIELDS ---
        ownerName,
        ownerTIN,
        accreditationNumber,
        accreditationDate,
        paymentTerms,
        businessStyle
    } = req.body;

    const updateData = {};
    
    if (appointmentSlotsPerDay !== undefined) updateData.appointmentSlotsPerDay = appointmentSlotsPerDay;
    if (gcashName !== undefined) updateData.gcashName = gcashName;
    if (gcashNumber !== undefined) updateData.gcashNumber = gcashNumber;
    if (shopAddress !== undefined) updateData.shopAddress = shopAddress;
    if (shopContactNumber !== undefined) updateData.shopContactNumber = shopContactNumber;
    if (shopEmail !== undefined) updateData.shopEmail = shopEmail;

    if (ownerName !== undefined) updateData.ownerName = ownerName;
    if (ownerTIN !== undefined) updateData.ownerTIN = ownerTIN;
    if (accreditationNumber !== undefined) updateData.accreditationNumber = accreditationNumber;
    if (accreditationDate !== undefined) updateData.accreditationDate = accreditationDate;
    if (paymentTerms !== undefined) updateData.paymentTerms = paymentTerms;
    if (businessStyle !== undefined) updateData.businessStyle = businessStyle;

    const updatedSettings = await Settings.findByIdAndUpdate(
        'shopSettings',
        { $set: updateData },
        { new: true, upsert: true, runValidators: true }
    );
    res.status(200).json(updatedSettings);
}));

module.exports = router;