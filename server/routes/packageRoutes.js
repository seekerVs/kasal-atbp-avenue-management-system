const express = require('express');
const mongoose = require('mongoose');
const PackageModel = require('../models/Package');
const asyncHandler = require('../utils/asyncHandler');
const Item = require('../models/Item');
const Rental = require('../models/Rental');
const Reservation = require('../models/Reservation');

const router = express.Router();

// GET /api/packages/
router.get('/', asyncHandler(async (req, res) => {
  const packages = await PackageModel.find({}).sort({ price: 1 });
  res.status(200).json(packages);
}));

// ADD THIS ROUTE after your main GET / route

// GET /api/packages/check-name - For frontend validation
router.get('/check-name', asyncHandler(async (req, res) => {
    const { name, excludeId } = req.query;
    if (!name) {
        return res.status(400).json({ message: "Name is required for check." });
    }

    const query = { name: { $regex: `^${name}$`, $options: 'i' } };
    if (excludeId) {
        query._id = { $ne: excludeId };
    }

    const pkg = await PackageModel.findOne(query);
    res.status(200).json({ isTaken: !!pkg });
}));

// --- GET availability for a single package on a specific date ---
router.get('/:id/availability', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { date } = req.query;

    if (!date) {
        res.status(400);
        throw new Error('A date query parameter is required for availability check.');
    }

    const pkg = await PackageModel.findById(id).lean();
    if (!pkg) {
        res.status(404);
        throw new Error('Package not found');
    }

    const userStartDate = new Date(date);
    userStartDate.setUTCHours(0, 0, 0, 0);

    const userEndDate = new Date(userStartDate);
    userEndDate.setDate(userEndDate.getDate() + 3);
    userEndDate.setUTCHours(23, 59, 59, 999);

    const allItemIds = [...new Set(
        pkg.colorMotifs.flatMap(m => 
            m.assignments.flatMap(a => 
                // This is the fix: filter out nulls before mapping
                a.assignedItems.filter(Boolean).map(i => i.itemId)
            )
        )
    )];

    // --- Step 2: Fetch all relevant data in parallel ---
    const [conflictingRentals, conflictingReservations, inventoryItems] = await Promise.all([
        Rental.find({
            status: { $in: ['To Pickup', 'To Return'] },
            rentalStartDate: { $lte: userEndDate },
            rentalEndDate: { $gte: userStartDate },
            $or: [
                { "singleRents.itemId": { $in: allItemIds } },
                { "packageRents.packageFulfillment.assignedItem.itemId": { $in: allItemIds.map(id => id.toString()) } }
            ]
        }).lean(),
        Reservation.find({
            status: { $in: ['Pending', 'Confirmed'] },
            reserveDate: {
                $lte: userEndDate,
                $gte: new Date(new Date(userStartDate).setDate(userStartDate.getDate() - 3))
            },
            $or: [
                { "itemReservations.itemId": { $in: allItemIds } },
                { "packageReservations.fulfillmentPreview.assignedItemId": { $in: allItemIds } }
            ]
        }).lean(),
        Item.find({ _id: { $in: allItemIds } }).lean()
    ]);

    const totalStockMap = new Map();
    inventoryItems.forEach(item => {
        item.variations.forEach(v => {
            totalStockMap.set(`${item._id}-${v.color.name}-${v.size}`, v.quantity);
        });
    });

    const bookedQuantities = new Map();
    const tally = (itemId, variationStr, quantity = 1) => {
        const key = `${itemId}-${variationStr.replace(', ', '-')}`;
        bookedQuantities.set(key, (bookedQuantities.get(key) || 0) + quantity);
    };
    
    conflictingRentals.forEach(r => {
        r.singleRents?.forEach(i => tally(i.itemId, `${i.variation.color.name}-${i.variation.size}`, i.quantity));
        r.packageRents?.forEach(p => p.packageFulfillment?.forEach(f => {
            if(f.assignedItem?.itemId && f.assignedItem?.variation) tally(f.assignedItem.itemId, f.assignedItem.variation);
        }));
    });
    conflictingReservations.forEach(r => {
        r.itemReservations?.forEach(i => tally(i.itemId, `${i.variation.color.name}-${i.variation.size}`, i.quantity));
        r.packageReservations?.forEach(p => p.fulfillmentPreview?.forEach(f => {
            if(f.assignedItemId && f.variation) tally(f.assignedItemId, f.variation);
        }));
    });

    // --- Step 3: Check availability for each motif ---
    const enrichedMotifs = pkg.colorMotifs.map(motif => {
        const requiredStockForMotif = new Map();
        motif.assignments.forEach(a => {
            // Filter out null/falsy values before iterating
            a.assignedItems.filter(Boolean).forEach(i => {
                const key = `${i.itemId}-${i.color.name}-${i.size}`;
                requiredStockForMotif.set(key, (requiredStockForMotif.get(key) || 0) + 1);
            });
        });

        let isMotifAvailable = true;
        for (const [key, required] of requiredStockForMotif.entries()) {
            const totalStock = totalStockMap.get(key) || 0;
            const booked = bookedQuantities.get(key) || 0;
            if ((totalStock - booked) < required) {
                isMotifAvailable = false;
                break; 
            }
        }
        return { ...motif, isAvailable: isMotifAvailable };
    });

    res.status(200).json({ ...pkg, colorMotifs: enrichedMotifs });
}));

// GET /api/packages/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const pkg = await PackageModel.findById(req.params.id).lean();
  if (!pkg) return res.status(404).json({ message: "Package not found." });
  res.status(200).json(pkg);
}));

// POST /api/packages/
router.post('/', asyncHandler(async (req, res, next) => {
  try {
    const newPackage = new PackageModel(req.body);
    const savedPackage = await newPackage.save();
    res.status(201).json(savedPackage);
  } catch (error) {
    if (error.code === 11000) {
      res.status(409); // Conflict
      throw new Error('A package with this name already exists.');
    }
    next(error);
  }
}));

// PUT /:id route
router.put('/:id', asyncHandler(async (req, res, next) => {
  try {
    const updatedPackage = await PackageModel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedPackage) return res.status(404).json({ message: "Package not found." });
    res.status(200).json(updatedPackage);
  } catch (error) {
    if (error.code === 11000) {
      res.status(409);
      throw new Error('A package with this name already exists.');
    }
    next(error);
  }
}));

// DELETE /api/packages/:id
router.delete('/:id', asyncHandler(async (req, res) => {
  const deletedPackage = await PackageModel.findByIdAndDelete(req.params.id);
  if (!deletedPackage) return res.status(404).json({ message: "Package not found." });
  res.status(200).json({ message: "Package deleted successfully." });
}));

module.exports = router;