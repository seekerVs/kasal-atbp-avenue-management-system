// server/routes/trackingRoutes.js

const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const Reservation = require('../models/Reservation');
const Appointment = require('../models/Appointment');

const router = express.Router();

// --- GET A RESERVATION OR APPOINTMENT BY ITS PUBLIC ID ---
// METHOD: GET /api/track/:id
// This is a public route, not protected by auth middleware.
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const searchId = id.trim().toUpperCase(); // Normalize the ID for reliable searching

    if (!searchId) {
      res.status(400);
      throw new Error('An ID is required to track a request.');
    }

    // Check if it's a Reservation ID
    if (searchId.startsWith('RES-')) {
      const reservation = await Reservation.findById(searchId).lean();
      
      if (reservation) {
        // If found, return it with a 'type' identifier
        return res.status(200).json({
          type: 'reservation',
          data: reservation,
        });
      }
    }

    // Check if it's an Appointment ID
    if (searchId.startsWith('APT-')) {
      const appointment = await Appointment.findById(searchId).lean();

      if (appointment) {
        return res.status(200).json({
          type: 'appointment',
          data: appointment,
        });
      }
    }

    // If the ID format is unrecognized or not found in either collection
    res.status(404);
    throw new Error('No request found with the provided ID. Please check the ID and try again.');
  })
);

module.exports = router;