const express = require('express');
const router = express.Router();
const Unavailability = require('../models/Unavailability');
const asyncHandler = require('../utils/asyncHandler');
const { protect } = require('../middleware/authMiddleware');
const { sanitizeRequestBody } = require('../middleware/sanitizeMiddleware');

// GET all unavailable dates (returns minimal data for the date picker)
// GET /api/unavailability
router.get('/', asyncHandler(async (req, res) => {
    // We only need the date field to disable days on the calendar
    const unavailableDates = await Unavailability.find({}).select('date').sort({ date: 1 });
    res.status(200).json(unavailableDates);
}));

router.put('/:id', protect, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
        res.status(400);
        throw new Error('A reason is required for the update.');
    }

    const updatedRecord = await Unavailability.findByIdAndUpdate(
        id,
        { $set: { reason } }, // Only update the reason field
        { new: true, runValidators: true }
    );

    if (!updatedRecord) {
        res.status(404);
        throw new Error('Unavailability record not found.');
    }
    res.status(200).json(updatedRecord);
}));

// NEW: GET the detailed schedule for a specific date
// GET /api/unavailability/by-date?date=YYYY-MM-DD
router.get('/by-date', protect, asyncHandler(async (req, res) => {
    const { date } = req.query;
    if (!date) {
        res.status(400);
        throw new Error('A date query parameter is required.');
    }
    const targetDate = new Date(date);
    targetDate.setUTCHours(0, 0, 0, 0);
    const schedule = await Unavailability.findOne({ date: targetDate });
    res.status(200).json(schedule); // Will be the document or null
}));

// GET /api/unavailability/all (Protected)
// Fetches full details for all upcoming scheduled/unavailable days.
router.get('/all', protect, asyncHandler(async (req, res) => {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0); // Set to the beginning of the day

    const allSchedules = await Unavailability.find({
        date: { $gte: today } // Find all documents from today onwards
    }).sort({ date: 1 }); // Sort them chronologically

    res.status(200).json(allSchedules);
}));

// REVISED: This route now creates or updates a day's schedule
// POST /api/unavailability
router.post('/', protect, asyncHandler(async (req, res) => {
    const { date, reason } = req.body;
    if (!date || !reason) {
        res.status(400);
        throw new Error('Date and reason are required.');
    }
    const newUnavailableDate = await Unavailability.create({ date, reason });
    res.status(201).json(newUnavailableDate);
}));

// DELETE an entire day's schedule
// DELETE /api/unavailability/:id
router.delete('/:id', protect, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const unavailableDate = await Unavailability.findByIdAndDelete(id);
    if (!unavailableDate) {
        res.status(404);
        throw new Error('Unavailability record not found.');
    }
    res.status(200).json({ message: 'Unavailability record deleted successfully.' });
}));

module.exports = router;