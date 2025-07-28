const express = require('express');
const router = express.Router();
const Unavailability = require('../models/Unavailability');
const asyncHandler = require('../utils/asyncHandler');
const { protect } = require('../middleware/authMiddleware'); // Secure these routes
const { sanitizeRequestBody } = require('../middleware/sanitizeMiddleware');

// --- GET ALL UNAVAILABLE DATES ---
// GET /api/unavailability
// Fetches all records. Can be public if customers need it for the date picker,
// or protected if only admins see it. Let's make it public for now.
router.get('/', asyncHandler(async (req, res) => {
    // Sort by date to ensure a consistent order
    const unavailableDates = await Unavailability.find({}).sort({ date: 1 });
    res.status(200).json(unavailableDates);
}));

// --- ADD A NEW UNAVAILABLE DATE (ADMIN ONLY) ---
// POST /api/unavailability
router.post('/', protect, sanitizeRequestBody, asyncHandler(async (req, res) => {
    const { date, reason } = req.body;

    if (!date || !reason) {
        res.status(400);
        throw new Error('Date and reason are required.');
    }

    // The pre-save hook in the model will handle setting the time to UTC midnight.
    const newUnavailableDate = new Unavailability({ date, reason });
    const savedDate = await newUnavailableDate.save();
    
    res.status(201).json(savedDate);
}));

// --- DELETE AN UNAVAILABLE DATE (ADMIN ONLY) ---
// DELETE /api/unavailability/:id
router.delete('/:id', protect, asyncHandler(async (req, res) => {
    const { id } = req.params;

    const unavailableDate = await Unavailability.findById(id);

    if (!unavailableDate) {
        res.status(404);
        throw new Error('Unavailability record not found.');
    }

    await unavailableDate.deleteOne();
    res.status(200).json({ message: 'Unavailability record deleted successfully.' });
}));

module.exports = router;