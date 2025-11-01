// server/routes/reservationRoutes.js

const express = require('express');
const { customAlphabet } = require('nanoid');
const Reservation = require('../models/Reservation');
const ItemModel = require('../models/Item');
const PackageModel = require('../models/Package');
const asyncHandler = require('../utils/asyncHandler');
const Appointment = require('../models/Appointment'); 
const { protect } = require('../middleware/authMiddleware');
const { sanitizeRequestBody } = require('../middleware/sanitizeMiddleware');
const mongoose = require('mongoose'); 
const { calculateFinancials } = require('../utils/financialsCalculator');
const Rental = require('../models/Rental');
const { sendReservationConfirmation } = require('../utils/emailService');
const Settings = require('../models/Settings');
const { checkAvailability } = require('../utils/availabilityChecker');

const router = express.Router();

const nanoid_reservation = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 8);
const nanoid_appointment = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 8); 
const nanoid_subdoc = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 8);

// METHOD: POST /api/reservations
// Can be accessed by clients or admins.
router.post(
  '/',
  sanitizeRequestBody,
  asyncHandler(async (req, res) => {
    const {
      customerInfo,
      reserveDate,
      itemReservations,
      packageReservations,
      financials,
      packageAppointmentDate,
      packageAppointmentBlock
    } = req.body;

    if (!customerInfo?.name || !customerInfo?.phoneNumber || !customerInfo?.email) {
      res.status(400);
      throw new Error("Customer name, phone number, and email are all required.");
    }
    if (!reserveDate) {
      res.status(400);
      throw new Error("A reservation date is required.");
    }
    const hasItems = (itemReservations && itemReservations.length > 0) || (packageReservations && packageReservations.length > 0);
    if (!hasItems) {
      res.status(400);
      throw new Error("A reservation must contain at least one item or package.");
    }

    const session = await mongoose.startSession();
    let savedReservation; // Variable to hold the result from the transaction

    try {
      // withTransaction will automatically commit if the callback succeeds,
      // or abort if it throws an error.
      await session.withTransaction(async () => {
        const itemsRequired = new Map();
        (itemReservations || []).forEach(item => {
            const key = `${item.itemId}-${item.variation.color.name}-${item.variation.size}`;
            itemsRequired.set(key, (itemsRequired.get(key) || 0) + item.quantity);
        });
        (packageReservations || []).forEach(pkg => {
            (pkg.fulfillmentPreview || []).forEach(f => {
                if (!f.isCustom && f.assignedItemId && f.variation) {
                    const [color, size] = f.variation.split(', ');
                    const key = `${f.assignedItemId}-${color}-${size}`;
                    itemsRequired.set(key, (itemsRequired.get(key) || 0) + 1);
                }
            });
        });

        const { isAvailable, conflictingItems } = await checkAvailability(itemsRequired, reserveDate, null, session);

        if (!isAvailable) {
          // Throwing an error here will automatically abort the transaction.
          const error = new Error("One or more items in your cart have become unavailable.");
          error.statusCode = 409; // 409 Conflict
          error.conflictingItems = conflictingItems;
          throw error;
        }
        
        const calculated = calculateFinancials({
          singleRents: itemReservations || [],
          packageRents: packageReservations || [],
          financials: {},
        });

        if (itemReservations) {
            itemReservations.forEach(item => { item.reservationId = `item_${nanoid_subdoc()}`; });
        }
        if (packageReservations) {
            packageReservations.forEach(pkg => { pkg.packageReservationId = `pkg_${nanoid_subdoc()}`; });
        }

        const newReservation = new Reservation({
            _id: `RES-${nanoid_reservation()}`,
            customerInfo,
            reserveDate,
            itemReservations,
            packageReservations,
            financials: {
                requiredDeposit: calculated.requiredDeposit,
                depositAmount: calculated.requiredDeposit, 
                payments: financials.payments || []
            },
            status: 'Pending',
            packageAppointmentDate,
            packageAppointmentBlock
        });

        await newReservation.save({ session });

        if (newReservation.packageReservations && newReservation.packageReservations.length > 0) {
            for (const pkg of newReservation.packageReservations) {
                for (const fulfillment of pkg.fulfillmentPreview) {
                    if (fulfillment.isCustom && !fulfillment.linkedAppointmentId && newReservation.packageAppointmentDate) {
                        const newAppointment = new Appointment({
                            _id: `APT-${nanoid_appointment()}`,
                            customerInfo: newReservation.customerInfo,
                            appointmentDate: newReservation.packageAppointmentDate,
                            timeBlock: newReservation.packageAppointmentBlock,
                            notes: fulfillment.notes || `For ${fulfillment.role} in reservation ${newReservation._id}`,
                            sourceReservationId: newReservation._id,
                            status: 'Pending',
                        });
                        const savedAppointment = await newAppointment.save({ session });
                        fulfillment.linkedAppointmentId = savedAppointment._id;
                    }
                }
            }
            await newReservation.save({ session });
        }
        
        // Assign the final object to the outer variable
        savedReservation = newReservation;
      }); // End of withTransaction

      // If the transaction was successful, this code will be reached
      if (savedReservation) {
        const finalCalculatedFinancials = calculateFinancials(savedReservation.toObject());
        const finalReservationObject = { ...savedReservation.toObject(), financials: finalCalculatedFinancials };

        Settings.findById('shopSettings').lean().then(shopSettings => {
            sendReservationConfirmation(finalReservationObject, shopSettings);
        }).catch(emailError => {
            console.error(`[Email Error] Failed to send confirmation for reservation ${finalReservationObject._id}:`, emailError);
        });
        
        res.status(201).json(finalReservationObject);
      } else {
        // This case should not happen if no error was thrown, but it's a safe fallback.
        throw new Error("Transaction completed but no reservation was saved.");
      }

    } catch (error) {
        // Re-throw the error to be caught by asyncHandler and sent to the global error handler
        throw error;
    } finally {
        // Always end the session
        await session.endSession();
    }
  })
);

// --- GET ALL RESERVATIONS (ADMIN ONLY) ---
// METHOD: GET /api/reservations
router.get(
  '/',
  protect,
  asyncHandler(async (req, res) => {
    // 1. Get pagination parameters from the query string
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10; // Default to 10 per page
    const skip = (page - 1) * limit;

    // We will build the filter based on all reservations for the count
    const filter = {}; // You can add status filters here later if needed

    // 2. Execute two queries in parallel for efficiency
    const [reservations, totalReservations] = await Promise.all([
      Reservation.find(filter).sort({ createdAt: -1 }).limit(limit).skip(skip).lean(),
      Reservation.countDocuments(filter)
    ]);

    const reservationsWithFinancials = reservations.map(res => {
        // The calculator needs `singleRents` and `packageRents` keys to work,
        // so we map our reservation data to that structure.
        const dataForCalc = {
            singleRents: res.itemReservations || [],
            packageRents: res.packageReservations || [],
            financials: res.financials // Pass existing financials like payments
        };
        return {
            ...res,
            financials: calculateFinancials(dataForCalc)
        };
    });

    // 3. Gather all unique Item and Package IDs from the CURRENT PAGE of reservations
    const itemIds = new Set();
    const packageIds = new Set();
    reservations.forEach(res => {
      res.itemReservations.forEach(item => itemIds.add(item.itemId));
      res.packageReservations.forEach(pkg => packageIds.add(pkg.packageId));
    });

    // 4. Fetch all required Items and Packages for the current page
    const [items, packages] = await Promise.all([
      ItemModel.find({ _id: { $in: [...itemIds] } }).select('variations').lean(),
      PackageModel.find({ _id: { $in: [...packageIds] } }).select('imageUrls').lean()
    ]);

    const itemMap = new Map(items.map(item => [item._id.toString(), item]));
    const packageMap = new Map(packages.map(pkg => [pkg._id.toString(), pkg]));

    // 5. Enrich the reservation data for the current page
    const enrichedReservations = reservationsWithFinancials.map(res => {
      const enrichedItems = res.itemReservations.map(item => {
        const fullItem = itemMap.get(item.itemId.toString());
        // Find variation by color HEX, which is more reliable than name
        const variation = fullItem?.variations.find(v => v.color.hex === item.variation.color.hex && v.size === item.variation.size);
        return { ...item, imageUrl: variation?.imageUrls?.[0] || null };
      });
      const enrichedPackages = res.packageReservations.map(pkg => {
        const fullPackage = packageMap.get(pkg.packageId.toString());
        return { ...pkg, imageUrl: fullPackage?.imageUrls[0] || null };
      });
      return { ...res, itemReservations: enrichedItems, packageReservations: enrichedPackages };
    });

    // 6. Send the paginated and enriched response
    res.status(200).json({
      reservations: enrichedReservations,
      currentPage: page,
      totalPages: Math.ceil(totalReservations / limit),
    });
  })
);

// --- GET A SINGLE RESERVATION (ADMIN ONLY) ---
// METHOD: GET /api/reservations/:id
router.get(
  '/:id',
  protect,
  asyncHandler(async (req, res) => {
    // --- THIS IS THE MODIFIED BLOCK ---
    const reservation = await Reservation.findById(req.params.id)
      .populate({
        path: 'packageReservations.fulfillmentPreview.assignedItemId',
        model: 'items', // Explicitly specify the model to use for population
        select: 'name variations' // We only need the name and variations (for the image)
      })
      .lean(); // .lean() should come after .populate()

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

// METHOD: PUT /api/reservations/:id/customer
router.put(
  '/:id/customer',
  protect, // Ensure only authenticated admins can access
  sanitizeRequestBody, // Reuse your existing sanitizer for name and address fields
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const newCustomerInfo = req.body;

    // Backend validation to ensure the payload is in the correct format
    if (!newCustomerInfo || !newCustomerInfo.name || !newCustomerInfo.phoneNumber || !newCustomerInfo.address) {
      res.status(400);
      throw new Error('Incomplete customer information provided.');
    }

    // Find the reservation and update the 'customerInfo' field.
    // The '$set' operator replaces the entire 'customerInfo' object with the new one.
    const updatedReservation = await Reservation.findByIdAndUpdate(
      id,
      { $set: { customerInfo: newCustomerInfo } },
      { new: true, runValidators: true } // Return the updated document
    ).populate({ // Re-populate the assigned items after the update
      path: 'packageReservations.fulfillmentPreview.assignedItemId',
      model: 'items',
      select: 'name variations'
    });
    
    if (!updatedReservation) {
      res.status(404);
      throw new Error('Reservation not found.');
    }

    // Send the full, updated reservation back to the frontend
    res.status(200).json(updatedReservation);
  })
);

// GET to check if a reservation reschedule is possible
router.get('/:id/check-reschedule', protect, asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { date } = req.query;

    const reservation = await Reservation.findById(id).lean();
    if (!reservation) {
        res.status(404);
        throw new Error("Reservation not found.");
    }

    // Build the list of required items from the reservation
    const itemsRequired = new Map();
    reservation.itemReservations.forEach(i => {
        const key = `${i.itemId}-${i.variation.color.name}-${i.variation.size}`;
        itemsRequired.set(key, (itemsRequired.get(key) || 0) + i.quantity);
    });
    reservation.packageReservations.forEach(p => p.fulfillmentPreview?.forEach(f => {
        if (!f.isCustom && f.assignedItemId && f.variation) {
            const [color, size] = f.variation.split(', ');
            const key = `${f.assignedItemId}-${color}-${size}`;
            itemsRequired.set(key, (itemsRequired.get(key) || 0) + 1);
        }
    }));

    // Call the universal availability checker
    const result = await checkAvailability(itemsRequired, date, id);
    res.status(200).json(result);
}));

router.put(
  '/:id/confirm',
  protect, // Admin only
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    const reservation = await Reservation.findById(id);

    if (!reservation) {
      res.status(404);
      throw new Error('Reservation not found.');
    }

    if (reservation.status !== 'Pending') {
      res.status(400);
      throw new Error(`Only reservations with a 'Pending' status can be confirmed. Current status: ${reservation.status}.`);
    }

    reservation.status = 'Confirmed';
    const updatedReservation = await reservation.save();

    res.status(200).json(updatedReservation);
  })
);

router.put(
  '/:id/cancel',
  protect, // Admin only
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    // --- (1) GET the reason from the request body ---
    const { reason } = req.body; 

    // --- (2) ADD validation for the reason ---
    if (!reason || typeof reason !== 'string' || reason.trim() === '') {
        res.status(400);
        throw new Error('A cancellation reason is required.');
    }
    
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const reservation = await Reservation.findById(id).session(session);
      if (!reservation) {
        res.status(404);
        throw new Error('Reservation not found.');
      }
      if (reservation.status === 'Completed' || reservation.status === 'Cancelled') {
        res.status(400);
        throw new Error(`This reservation cannot be cancelled as it is already ${reservation.status}.`);
      }

      // ... (The entire stock restoration logic remains exactly the same)
      const stockUpdateOperations = [];
      if (reservation.itemReservations && reservation.itemReservations.length > 0) {
        for (const item of reservation.itemReservations) {
          stockUpdateOperations.push({
            updateOne: {
              filter: { _id: item.itemId, "variations.color.hex": item.variation.color.hex, "variations.size": item.variation.size },
              update: { $inc: { "variations.$.quantity": item.quantity } }
            }
          });
        }
      }
      if (reservation.packageReservations && reservation.packageReservations.length > 0) {
        for (const pkg of reservation.packageReservations) {
          for (const fulfillment of pkg.fulfillmentPreview) {
            if (fulfillment.assignedItemId && fulfillment.variation) {
              const [colorName, size] = fulfillment.variation.split(',').map(s => s.trim());
              stockUpdateOperations.push({
                updateOne: {
                  filter: { _id: fulfillment.assignedItemId, "variations.color.name": colorName, "variations.size": size },
                  update: { $inc: { "variations.$.quantity": 1 } }
                }
              });
            }
          }
        }
      }
      if (stockUpdateOperations.length > 0) {
        await ItemModel.bulkWrite(stockUpdateOperations, { session });
      }

      // --- (3) UPDATE the reservation status AND the new reason field ---
      reservation.status = 'Cancelled';
      // The old logic for the reason was removed in a previous step, so we add the new one.
      reservation.cancellationReason = reason;
      const updatedReservation = await reservation.save({ session });

      await session.commitTransaction();
      res.status(200).json(updatedReservation);

    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  })
);

// METHOD: PUT /api/reservations/:id/reschedule
router.put(
  '/:id/reschedule',
  protect, // Admin only
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { newDate } = req.body;

    if (!newDate) {
      res.status(400);
      throw new Error('A new reservation date is required.');
    }

    const reservation = await Reservation.findById(id);
    if (!reservation) {
      res.status(404);
      throw new Error('Reservation not found.');
    }

    // Only pending or confirmed reservations can be rescheduled
    if (reservation.status !== 'Pending' && reservation.status !== 'Confirmed') {
        res.status(400);
        throw new Error(`Cannot reschedule a reservation with status "${reservation.status}".`);
    }

    // Update the date and save
    reservation.reserveDate = newDate;
    const updatedReservation = await reservation.save();

    // Re-populate to send back the full data, just like the GET route
    const populatedReservation = await Reservation.findById(updatedReservation._id)
      .populate({
        path: 'packageReservations.fulfillmentPreview.assignedItemId',
        model: 'items',
        select: 'name variations'
      })
      .lean();

    res.status(200).json(populatedReservation);
  })
);


// METHOD: POST /api/reservations/check-availability
// Checks if a list of items is available for a given date.
router.post(
  '/check-availability',
  protect,
  asyncHandler(async (req, res) => {
    const { newDate, items: requestedItems, reservationIdToExclude } = req.body;

    if (!newDate || !requestedItems || !Array.isArray(requestedItems)) {
      res.status(400);
      throw new Error('A new date and a list of items are required.');
    }

    const targetDate = new Date(newDate);
    
    // --- Step 1: Find all conflicting reservations and rentals ---
    const reservationFilter = {
      reserveDate: targetDate,
      status: 'Confirmed', // Only check against other confirmed reservations
    };

    // If an ID to exclude was provided, add it to the filter.
    if (reservationIdToExclude) {
      reservationFilter._id = { $ne: reservationIdToExclude }; // $ne means "not equal"
    }

    const conflictingBookings = await Reservation.find(reservationFilter).lean();

    const conflictingRentals = await Rental.find({
        // A rental conflicts if the target date is between its start and end dates
        rentalStartDate: { $lte: targetDate },
        rentalEndDate: { $gte: targetDate },
        status: { $in: ['To Pickup', 'To Return'] } // Active rental statuses
    }).lean();

    // --- Step 2: Tally all booked items from the conflicting bookings ---
    const bookedQuantities = new Map();

    const tallyItem = (itemId, variation, quantity) => {
        const key = `${itemId}-${variation}`;
        bookedQuantities.set(key, (bookedQuantities.get(key) || 0) + quantity);
    };

    conflictingBookings.forEach(res => {
        res.itemReservations.forEach(item => tallyItem(item.itemId, `${item.variation.color.name}, ${item.variation.size}`, item.quantity));
        res.packageReservations.forEach(pkg => {
            pkg.fulfillmentPreview.forEach(f => {
                if (!f.isCustom && f.assignedItemId && f.variation) {
                    tallyItem(f.assignedItemId, f.variation, 1);
                }
            });
        });
    });

    conflictingRentals.forEach(rental => {
        rental.singleRents.forEach(item => tallyItem(item.itemId, `${item.variation.color.name}, ${item.variation.size}`, item.quantity));
        rental.packageRents.forEach(pkg => {
            pkg.packageFulfillment.forEach(f => {
                if (!f.isCustom && f.assignedItem && f.assignedItem.itemId && f.assignedItem.variation) {
                    tallyItem(f.assignedItem.itemId, f.assignedItem.variation, 1);
                }
            });
        });
    });

    // --- Step 3: Get the total stock for all requested items ---
    const allItemIds = requestedItems.map(i => i.itemId);
    const inventoryItems = await ItemModel.find({ _id: { $in: allItemIds } }).lean();
    const totalStock = new Map();
    inventoryItems.forEach(item => {
        item.variations.forEach(v => {
            const key = `${item._id}-${v.color.name}, ${v.size}`;
            totalStock.set(key, v.quantity);
        });
    });
    
    // --- Step 4: Compare requested items against available stock ---
    const availabilityResult = [];
    for (const requested of requestedItems) {
        const key = `${requested.itemId}-${requested.variation}`;
        const total = totalStock.get(key) || 0;
        const booked = bookedQuantities.get(key) || 0;
        const available = total - booked;

        if (available < requested.quantity) {
            availabilityResult.push({
                itemName: requested.name,
                variation: requested.variation,
                requested: requested.quantity,
                available: available,
            });
        }
    }

    res.status(200).json({ unavailableItems: availabilityResult });
  })
);


module.exports = router;