// server/routes/reservationRoutes.js

const express = require('express');
const { customAlphabet } = require('nanoid');
const Reservation = require('../models/Reservation');
const asyncHandler = require('../utils/asyncHandler');
const Appointment = require('../models/Appointment'); 
const { protect } = require('../middleware/authMiddleware');
const { sanitizeRequestBody } = require('../middleware/sanitizeMiddleware');

const router = express.Router();

const nanoid_reservation = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 8);
const nanoid_appointment = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 8); 
const nanoid_subdoc = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 8);

// --- CREATE A NEW RESERVATION ---
// METHOD: POST /api/reservations
// Can be accessed by clients or admins.
router.post(
  '/',
  sanitizeRequestBody,
  asyncHandler(async (req, res) => {
    const { customerInfo, eventDate, itemReservations, packageReservations } = req.body;

    // Backend Validation
    if (!customerInfo?.name || !customerInfo?.phoneNumber) {
        res.status(400).json({ message: "Customer name and phone number are required." });
        return;
    }
    if (!eventDate) {
        res.status(400).json({ message: "An event date is required." });
        return;
    }
    const hasItems = (itemReservations && itemReservations.length > 0) || (packageReservations && packageReservations.length > 0);
    if (!hasItems) {
        res.status(400).json({ message: "A reservation must contain at least one item or package." });
        return;
    }

    // Assign unique IDs to sub-documents
    if (itemReservations) {
        itemReservations.forEach(item => { item.reservationId = `item_${nanoid_subdoc()}`; });
    }
    if (packageReservations) {
        packageReservations.forEach(pkg => { pkg.packageReservationId = `pkg_${nanoid_subdoc()}`; });
    }

    const newReservation = new Reservation({
        _id: `RES-${nanoid_reservation()}`,
        ...req.body,
        status: 'Pending',
    });

    let savedReservation = await newReservation.save();

    // --- 2. NEW LOGIC: Check for and create linked appointments ---
    let appointmentsCreated = false;
    if (savedReservation.packageReservations && savedReservation.packageReservations.length > 0) {
      // Use Promise.all to handle multiple appointment creations concurrently
      await Promise.all(savedReservation.packageReservations.map(async (pkg) => {
        await Promise.all(pkg.fulfillmentPreview.map(async (fulfillment) => {
          if (fulfillment.isCustom && !fulfillment.linkedAppointmentId) {
            appointmentsCreated = true;

            // Create a new Appointment document
            const newAppointment = new Appointment({
              _id: `APT-${nanoid_appointment()}`,
              customerInfo: savedReservation.customerInfo,
              // Use the eventDate as a placeholder appointment date
              appointmentDate: savedReservation.eventDate,
              status: 'Pending',
              statusNote: `Auto-generated for custom item: '${fulfillment.role}' from Reservation ID: ${savedReservation._id}`,
              sourceReservationId: savedReservation._id,
            });
            const savedAppointment = await newAppointment.save();

            // Link the new appointment ID back to the reservation's fulfillment preview
            fulfillment.linkedAppointmentId = savedAppointment._id;
          }
        }));
      }));
    }

    // 3. If appointments were created, we must save the reservation AGAIN to persist the linkedAppointmentId changes
    if (appointmentsCreated) {
      savedReservation = await savedReservation.save();
    }
    
    res.status(201).json(savedReservation);
  })
);

// --- GET ALL RESERVATIONS (ADMIN ONLY) ---
// METHOD: GET /api/reservations
router.get(
  '/',
  protect,
  asyncHandler(async (req, res) => {
    const reservations = await Reservation.find({}).sort({ eventDate: -1 }).lean();
    res.status(200).json(reservations);
  })
);

// --- GET A SINGLE RESERVATION (ADMIN ONLY) ---
// METHOD: GET /api/reservations/:id
router.get(
  '/:id',
  protect,
  asyncHandler(async (req, res) => {
    const reservation = await Reservation.findById(req.params.id).lean();
    if (!reservation) {
      res.status(404).json({ message: 'Reservation not found.' });
      return;
    }
    res.status(200).json(reservation);
  })
);

// --- UPDATE A RESERVATION (ADMIN ONLY) ---
// METHOD: PUT /api/reservations/:id
router.put(
  '/:id',
  protect,
  sanitizeRequestBody,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    delete updateData._id;

    const updatedReservation = await Reservation.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedReservation) {
      res.status(404).json({ message: 'Reservation not found.' });
      return;
    }
    res.status(200).json(updatedReservation);
  })
);

module.exports = router;