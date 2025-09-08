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
    const { customerInfo, appointmentDate, notes, timeBlock } = req.body;

    // Backend Validation
    if (!customerInfo?.name || !customerInfo?.phoneNumber) {
      res.status(400).json({ message: 'Customer name and phone number are required.' });
      return;
    }
    if (!appointmentDate) {
      res.status(400).json({ message: 'An appointment date is required.' });
      return;
    }

    if (!timeBlock || !['morning', 'afternoon'].includes(timeBlock)) {
      res.status(400).json({ message: 'A valid time block (morning/afternoon) is required.'});
      return;
    }
    
    const newAppointment = new Appointment({
      _id: `APT-${nanoid_appointment()}`,
      customerInfo: customerInfo,
      appointmentDate: new Date(appointmentDate),
      timeBlock: timeBlock,
      notes: notes,
      status: 'Pending',
    });

    const savedAppointment = await newAppointment.save();
    res.status(201).json(savedAppointment);
  })
);

router.get(
  '/day-availability', // Changed route name
  asyncHandler(async (req, res) => {
    const { date } = req.query;
    if (!date) {
      res.status(400);
      throw new Error('A date query parameter is required.');
    }

    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);
    
    // 1. Fetch settings and active appointments in parallel.
    const [settings, appointmentsOnDate] = await Promise.all([
      Settings.findById('shopSettings').lean(),
      Appointment.find({
        appointmentDate: { $gte: startOfDay, $lte: endOfDay },
        status: { $in: ['Pending', 'Confirmed'] } // Exclude completed/cancelled
      }).lean()
    ]);

    // 2. Get the total slots for the day and calculate per-block slots.
    const totalSlots = settings?.appointmentSlotsPerDay || 8; // Default to 8 if not set
    const morningSlots = Math.ceil(totalSlots / 2);
    const afternoonSlots = Math.floor(totalSlots / 2);

    // 3. Tally the number of appointments already booked in each block.
    let morningBooked = 0;
    let afternoonBooked = 0;
    
    for (const apt of appointmentsOnDate) {
      const appointmentHour = new Date(apt.appointmentDate).getHours();
      if (appointmentHour < 12) { // Morning is any hour before 12 PM
        morningBooked++;
      } else { // Afternoon is 12 PM and onwards
        afternoonBooked++;
      }
    }

    // 4. Determine if each block has available slots.
    const isMorningAvailable = morningBooked < morningSlots;
    const isAfternoonAvailable = afternoonBooked < afternoonSlots;

    // 5. Send the new, simplified response object.
    res.status(200).json({
      morning: { available: isMorningAvailable, booked: morningBooked, total: morningSlots },
      afternoon: { available: isAfternoonAvailable, booked: afternoonBooked, total: afternoonSlots }
    });
  })
);

// --- GET ALL APPOINTMENTS (ADMIN ONLY) ---
// METHOD: GET /api/appointments
router.get(
  '/',
  protect,
  asyncHandler(async (req, res) => {
    // --- (1) Get pagination and filter parameters ---
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10; // Default to 10 per page
    const skip = (page - 1) * limit;

    const filter = {}; // You can add status/search filters here in the future if needed

    // --- (2) Execute two queries in parallel for efficiency ---
    const [appointments, totalAppointments] = await Promise.all([
      Appointment.find(filter)
        .sort({ appointmentDate: -1 })
        .limit(limit)
        .skip(skip)
        .lean(),
      Appointment.countDocuments(filter)
    ]);
    
    // --- (3) Send the paginated response object ---
    res.status(200).json({
        appointments: appointments,
        currentPage: page,
        totalPages: Math.ceil(totalAppointments / limit)
    });
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

// METHOD: PUT /api/appointments/:id/cancel
router.put(
  '/:id/cancel',
  protect,
  sanitizeRequestBody,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || typeof reason !== 'string' || reason.trim() === '') {
      res.status(400);
      throw new Error('A cancellation reason is required.');
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      res.status(404);
      throw new Error('Appointment not found.');
    }

    // Prevent cancelling an already completed or cancelled appointment
    if (['Completed', 'Cancelled'].includes(appointment.status)) {
        res.status(400);
        throw new Error(`Cannot cancel an appointment with status "${appointment.status}".`);
    }

    // Update the document
    appointment.status = 'Cancelled';
    appointment.cancellationReason = reason;
    const updatedAppointment = await appointment.save();

    res.status(200).json(updatedAppointment);
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