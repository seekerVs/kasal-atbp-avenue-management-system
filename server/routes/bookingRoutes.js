const express = require('express');
const { customAlphabet } = require('nanoid');
const Booking = require('../models/Booking');
const asyncHandler = require('../utils/asyncHandler');
const { protect } = require('../middleware/authMiddleware');
const { sanitizeRequestBody } = require('../middleware/sanitizeMiddleware');

const router = express.Router();

// --- Helper for creating custom, URL-friendly IDs ---
const nanoid_booking = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 6);
const nanoid_subdoc = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 8);

// ===================================================================================
// --- CREATE A NEW BOOKING (PUBLIC ROUTE) ---
// METHOD: POST /api/bookings
// Accessible by clients/customers.
// ===================================================================================
router.post(
  '/',
  // NOTICE: The 'protect' middleware is intentionally REMOVED from this route.
  sanitizeRequestBody, // Sanitize incoming data first.
  asyncHandler(async (req, res) => {
    const { customerInfo, eventDate, itemReservations, packageReservations } = req.body;

    // --- 1. Backend Validation ---
    if (!customerInfo?.name || !customerInfo?.phoneNumber || !customerInfo?.address) {
      res.status(400);
      throw new Error('Customer name, phone number, and address are required.');
    }
    if (!eventDate) {
      res.status(400);
      throw new Error('An event date is required.');
    }
    // Check for duplicate booking attempts based on key info
    const existingBooking = await Booking.findOne({
        "customerInfo.phoneNumber": customerInfo.phoneNumber,
        "eventDate": new Date(eventDate),
        "status": { $in: ["Pending", "Confirmed"] }
    });

    if (existingBooking) {
        res.status(409); // 409 Conflict
        throw new Error('A similar booking for this phone number and event date already exists.');
    }


    // --- 2. Generate Unique IDs ---
    const bookingId = `BK-${nanoid_booking()}`;
    
    // Assign unique IDs to all sub-documents that need one
    if (itemReservations) {
      itemReservations.forEach(item => {
        item.reservationId = `item_${nanoid_subdoc()}`;
      });
    }
    if (packageReservations) {
      packageReservations.forEach(pkg => {
        pkg.packageReservationId = `pkg_${nanoid_subdoc()}`;
        // Automatically create pending appointments for custom roles
        if (pkg.fulfillmentPreview) {
          const customRoles = pkg.fulfillmentPreview.filter(f => f.isCustom);
          if (customRoles.length > 0) {
            req.body.appointments = req.body.appointments || [];
            customRoles.forEach(role => {
              req.body.appointments.push({
                appointmentId: `apt_${nanoid_subdoc()}`,
                status: 'Pending',
                appointmentFor: {
                  sourcePackageReservationId: pkg.packageReservationId,
                  role: role.role
                },
              });
            });
          }
        }
      });
    }

    // --- 3. Create the New Booking Document ---
    const newBooking = new Booking({
      _id: bookingId,
      ...req.body,
      status: 'Pending', // Explicitly set initial status
    });

    const savedBooking = await newBooking.save();
    res.status(201).json(savedBooking);
  })
);


// ===================================================================================
// --- GET ALL BOOKINGS (ADMIN ONLY) ---
// METHOD: GET /api/bookings
// ===================================================================================
router.get(
  '/',
  protect, // This route is protected.
  asyncHandler(async (req, res) => {
    const bookings = await Booking.find({}).sort({ eventDate: -1 }).lean();
    res.status(200).json(bookings);
  })
);


// ===================================================================================
// --- GET A SINGLE BOOKING BY ID (ADMIN ONLY) ---
// METHOD: GET /api/bookings/:id
// ===================================================================================
router.get(
  '/:id',
  protect, // This route is protected.
  asyncHandler(async (req, res) => {
    const booking = await Booking.findById(req.params.id).lean();
    if (!booking) {
      res.status(404);
      throw new Error('Booking not found.');
    }
    res.status(200).json(booking);
  })
);


// ===================================================================================
// --- UPDATE A BOOKING (ADMIN ONLY) ---
// METHOD: PUT /api/bookings/:id
// This will handle status changes, adding processedItemData, etc.
// ===================================================================================
router.put(
  '/:id',
  protect, // This route is protected.
  sanitizeRequestBody,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    
    // For security, prevent a client from trying to update the _id field
    delete updateData._id;

    const updatedBooking = await Booking.findByIdAndUpdate(
      id,
      { $set: updateData }, // Use $set to prevent overwriting the entire document
      { new: true, runValidators: true } // Return the new document and run schema validators
    );

    if (!updatedBooking) {
      res.status(404);
      throw new Error('Booking not found.');
    }
    res.status(200).json(updatedBooking);
  })
);


// ===================================================================================
// --- DELETE/CANCEL A BOOKING (ADMIN ONLY) ---
// METHOD: DELETE /api/bookings/:id
// ===================================================================================
router.delete(
  '/:id',
  protect, // This route is protected.
  asyncHandler(async (req, res) => {
      const { id } = req.params;
      const booking = await Booking.findById(id);

      if (!booking) {
          res.status(404);
          throw new Error('Booking not found.');
      }
      
      // Instead of deleting, we update the status to 'Cancelled'.
      // This preserves the record for historical purposes.
      booking.status = 'Cancelled';
      await booking.save();
      
      res.status(200).json({ message: `Booking ${id} has been cancelled.` });
  })
);

module.exports = router;