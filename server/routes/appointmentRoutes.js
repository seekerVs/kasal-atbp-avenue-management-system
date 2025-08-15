// server/routes/appointmentRoutes.js

const express = require('express');
const { customAlphabet } = require('nanoid');
const Appointment = require('../models/Appointment');
const Settings = require('../models/Settings');
const asyncHandler = require('../utils/asyncHandler');
const { protect } = require('../middleware/authMiddleware');
const { sanitizeRequestBody } = require('../middleware/sanitizeMiddleware');

const router = express.Router();

const nanoid_appointment = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 8);

// --- CREATE A NEW APPOINTMENT ---
// METHOD: POST /api/appointments
// Can be accessed by clients or admins.
router.post(
  '/',
  sanitizeRequestBody,
  asyncHandler(async (req, res) => {
    const { customerInfo, appointmentDate } = req.body;

    // Backend Validation
    if (!customerInfo?.name || !customerInfo?.phoneNumber) {
      res.status(400).json({ message: 'Customer name and phone number are required.' });
      return;
    }
    if (!appointmentDate) {
      res.status(400).json({ message: 'An appointment date is required.' });
      return;
    }
    
    const newAppointment = new Appointment({
      _id: `APT-${nanoid_appointment()}`,
      ...req.body,
      status: 'Pending',
    });

    const savedAppointment = await newAppointment.save();
    res.status(201).json(savedAppointment);
  })
);

router.get(
  '/booked-slots',
  asyncHandler(async (req, res) => {
    const { date } = req.query;
    if (!date) {
      res.status(400);
      throw new Error('A date query parameter is required.');
    }

    // A. Define the start and end of the target day in UTC
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    // B. Fetch settings and active appointments in parallel
    const [settings, appointmentsOnDate] = await Promise.all([
      Settings.findById('shopSettings').lean(),
      Appointment.find({
        appointmentDate: { $gte: startOfDay, $lte: endOfDay },
        status: { $in: ['Pending', 'Confirmed', 'Completed'] } // Exclude cancelled/no-shows
      }).lean()
    ]);

    // C. Get the maximum allowed slots per hour from settings
    const slotsPerHour = settings?.appointmentSlotsPerHour || 2; // Default to 2 if not set

    // D. Count the number of appointments for each hour
    const hourlyCounts = {};
    for (const apt of appointmentsOnDate) {
      // Get the hour (0-23) in the server's local timezone (or UTC if configured)
      const hour = new Date(apt.appointmentDate).getHours(); 
      hourlyCounts[hour] = (hourlyCounts[hour] || 0) + 1;
    }

    // E. Identify and collect the hours that are fully booked
    const fullyBookedSlots = [];
    for (const hour in hourlyCounts) {
      if (hourlyCounts[hour] >= slotsPerHour) {
        // Format the hour as a two-digit string (e.g., "09:00", "14:00")
        const formattedHour = hour.padStart(2, '0');
        fullyBookedSlots.push(`${formattedHour}:00`);
        fullyBookedSlots.push(`${formattedHour}:30`); // Also block the half-hour slot
      }
    }

    // F. Send the array of fully booked time strings to the frontend
    res.status(200).json(fullyBookedSlots);
  })
);

// --- GET ALL APPOINTMENTS (ADMIN ONLY) ---
// METHOD: GET /api/appointments
router.get(
  '/',
  protect,
  asyncHandler(async (req, res) => {
    const appointments = await Appointment.find({}).sort({ appointmentDate: -1 }).lean();
    res.status(200).json(appointments);
  })
);

// --- GET A SINGLE APPOINTMENT (ADMIN ONLY) ---
// METHOD: GET /api/appointments/:id
router.get(
  '/:id',
  protect,
  asyncHandler(async (req, res) => {
    const appointment = await Appointment.findById(req.params.id).lean();
    if (!appointment) {
      res.status(404).json({ message: 'Appointment not found.' });
      return;
    }
    res.status(200).json(appointment);
  })
);

// --- UPDATE AN APPOINTMENT (ADMIN ONLY) ---
router.put(
  '/:id',
  protect,
  sanitizeRequestBody,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    delete updateData._id; // Prevent changing the ID

    // Mongoose's findByIdAndUpdate with $set is perfect for this.
    // It will only update the fields provided in `updateData`.
    const updatedAppointment = await Appointment.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true } // runValidators ensures our new enum statuses are checked
    );

    if (!updatedAppointment) {
      res.status(404).json({ message: 'Appointment not found.' });
      return;
    }
    res.status(200).json(updatedAppointment);
  })
);

module.exports = router;