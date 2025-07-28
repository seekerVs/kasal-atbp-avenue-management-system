// server/routes/appointmentRoutes.js

const express = require('express');
const { customAlphabet } = require('nanoid');
const Appointment = require('../models/Appointment');
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