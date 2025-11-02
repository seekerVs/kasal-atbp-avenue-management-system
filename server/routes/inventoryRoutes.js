// server/routes/inventoryRoutes.js

const express = require('express');
const ItemModel = require('../models/Item');
const asyncHandler = require('../utils/asyncHandler');
const { del } = require('@vercel/blob');
const mongoose = require('mongoose');
const Rental = require('../models/Rental');
const Reservation = require('../models/Reservation');
const { checkAvailability } = require('../utils/availabilityChecker');

const router = express.Router();

// --- GET all inventory items (Existing) ---
router.get('/', asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 18;
  const { category, ageGroup, gender, search, sort, colorHex, excludeCategory, size, availabilityDate } = req.query;

  if (availabilityDate) {
    // --- NEW LOGIC USING THE REUSABLE UTILITY ---
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 18;
    const skip = (page - 1) * limit;
    
    // Step 1: Build the initial filter for items, just like in the 'else' block
    const initialFilter = {};
    if (category) initialFilter.category = category;
    if (ageGroup) initialFilter.ageGroup = ageGroup;
    if (gender) initialFilter.gender = gender;
    if (search) initialFilter.name = { $regex: search, $options: 'i' };
    if (excludeCategory) initialFilter.category = { $ne: excludeCategory };
    if (size) initialFilter['variations.size'] = size;
    
    // Always ensure we only start with items that have some stock in general
    initialFilter['variations.quantity'] = { $gt: 0 };
    
    // Find all candidate items that match the basic filters
    const candidateItems = await ItemModel.find(initialFilter).lean();

    // Step 2: For each candidate, check its real-time availability
    const availableItems = [];
    for (const item of candidateItems) {
        const availableVariations = [];
        for (const variation of item.variations) {
            // We only need to check variations that have stock and match the size filter (if any)
            if (variation.quantity > 0 && (!size || variation.size === size)) {
                const itemsRequired = new Map([
                    [`${item._id}-${variation.color.name}-${variation.size}`, 1] // Check availability for just one piece
                ]);
                
                const { isAvailable } = await checkAvailability(itemsRequired, availabilityDate);
                
                if (isAvailable) {
                    availableVariations.push(variation);
                }
            }
        }
        
        // If any of the item's variations were available, add the item to our final list
        if (availableVariations.length > 0) {
            availableItems.push({ ...item, variations: availableVariations });
        }
    }

    // Step 3: Apply sorting and pagination in JavaScript
    if (sort === 'price_asc') availableItems.sort((a, b) => a.price - b.price);
    if (sort === 'price_desc') availableItems.sort((a, b) => b.price - a.price);
    // Note: 'latest' and 'relevance' sorting are harder here; this is a simplified sort

    const totalItems = availableItems.length;
    const paginatedItems = availableItems.slice(skip, skip + limit);

    res.status(200).json({
      items: paginatedItems,
      currentPage: page,
      totalPages: Math.ceil(totalItems / limit),
      totalItems: totalItems,
    });

  } else {
    // --- EXISTING LOGIC FOR WHEN NO DATE IS PROVIDED ---
    const filter = {};
    if (category) filter.category = category;
    if (ageGroup) filter.ageGroup = ageGroup;
    if (gender) filter.gender = gender;
    if (search) filter.name = { $regex: search, $options: 'i' };
    if (excludeCategory) filter.category = { $ne: excludeCategory };
    const variationMatch = { quantity: { $gt: 0 } };
    if (size) {
      variationMatch.size = size;
    }
    filter.variations = { $elemMatch: variationMatch };

    const sortOptions = {};
    if (sort === 'price_asc') sortOptions.price = 1;
    if (sort === 'price_desc') sortOptions.price = -1;
    if (sort === 'latest') sortOptions.createdAt = -1;
    if (Object.keys(sortOptions).length === 0) sortOptions.name = 1;

    const skip = (page - 1) * limit;

    const [items, totalItems] = await Promise.all([
      ItemModel.find(filter).sort(sortOptions).limit(limit).skip(skip).lean(),
      ItemModel.countDocuments(filter)
    ]);

    res.status(200).json({
      items,
      currentPage: page,
      totalPages: Math.ceil(totalItems / limit),
      totalItems: totalItems,
    });
  }
}));

router.get('/check-name', asyncHandler(async (req, res) => {
    const { name, excludeId } = req.query;

    if (!name) {
        return res.status(400).json({ message: "Name is required for check." });
    }

    const query = { name: { $regex: `^${name}$`, $options: 'i' } }; // Case-insensitive exact match
    if (excludeId) {
        query._id = { $ne: excludeId }; // Exclude the current item when editing
    }

    const item = await ItemModel.findOne(query);
    
    res.status(200).json({ isTaken: !!item }); // Send back true if item exists, false otherwise
}));

// --- GET a single item by ID (Good practice to add this) ---
router.get('/:id', asyncHandler(async (req, res) => {
    const item = await ItemModel.findById(req.params.id);
    if (!item) {
        res.status(404);
        throw new Error('Item not found');
    }
    res.status(200).json(item);
}));

// --- GET item by full name (Existing) ---
router.get('/byFullName/:fullName', asyncHandler(async (req, res) => {
  const productName = req.params.fullName.split(',')[0];
  const item = await ItemModel.findOne({ name: productName }).lean();
  if (!item) return res.status(404).json({ message: "Item not found." });
  res.status(200).json(item);
}));


// --- GET availability for a single item on a specific date ---
router.get('/:id/availability', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { date } = req.query;

    if (!date) {
        res.status(400);
        throw new Error('A date query parameter is required for availability check.');
    }

    const item = await ItemModel.findById(id).lean();
    if (!item) {
        res.status(404);
        throw new Error('Item not found');
    }

    const userStartDate = new Date(date);
    userStartDate.setUTCHours(0, 0, 0, 0);

    const userEndDate = new Date(userStartDate);
    userEndDate.setDate(userEndDate.getDate() + 3);
    userEndDate.setUTCHours(23, 59, 59, 999);

    // --- Find all conflicting bookings for THIS item's variations ---
    const [conflictingRentals, conflictingReservations] = await Promise.all([
        Rental.find({
            status: { $in: ['To Pickup', 'To Return'] },
            rentalStartDate: { $lte: userEndDate },
            rentalEndDate: { $gte: userStartDate },
            $or: [
                { "singleRents.itemId": id },
                { "packageRents.packageFulfillment.assignedItem.itemId": id.toString() }
            ]
        }).lean(),
        Reservation.find({
            status: { $in: ['Pending', 'Confirmed'] },
            reserveDate: {
                $lte: userEndDate,
                $gte: new Date(new Date(userStartDate).setDate(userStartDate.getDate() - 3)) // Reservation start date could be up to 3 days prior
            },
            $or: [
                { "itemReservations.itemId": id },
                { "packageReservations.fulfillmentPreview.assignedItemId": id }
            ]
        }).lean()
    ]);

    // --- Tally the booked quantities for each variation ---
    const bookedQuantities = new Map();
    const tally = (variationKey, quantity = 1) => {
        bookedQuantities.set(variationKey, (bookedQuantities.get(variationKey) || 0) + quantity);
    };

    const itemObjectId = new mongoose.Types.ObjectId(id);

    conflictingRentals.forEach(rental => {
        rental.singleRents?.forEach(sr => {
            if (sr.itemId.equals(itemObjectId)) {
                tally(`${sr.variation.color.name}-${sr.variation.size}`, sr.quantity);
            }
        });
        rental.packageRents?.forEach(pr => {
            pr.packageFulfillment?.forEach(pf => {
                if (pf.assignedItem?.itemId === id) {
                    const [color, size] = pf.assignedItem.variation.split(', ');
                    tally(`${color}-${size}`);
                }
            });
        });
    });

    conflictingReservations.forEach(res => {
        res.itemReservations?.forEach(ir => {
            if (ir.itemId.equals(itemObjectId)) {
                tally(`${ir.variation.color.name}-${ir.variation.size}`, ir.quantity);
            }
        });
        res.packageReservations?.forEach(pr => {
            pr.fulfillmentPreview?.forEach(fp => {
                if (fp.assignedItemId?.equals(itemObjectId)) {
                    const [color, size] = fp.variation.split(', ');
                    tally(`${color}-${size}`);
                }
            });
        });
    });

    // --- Enrich the item's variations with availableStock ---
    const enrichedVariations = item.variations.map(variation => {
        const variationKey = `${variation.color.name}-${variation.size}`;
        const bookedCount = bookedQuantities.get(variationKey) || 0;
        const availableStock = variation.quantity - bookedCount;
        return {
            ...variation,
            availableStock: availableStock > 0 ? availableStock : 0 // Ensure it doesn't go below 0
        };
    });

    res.status(200).json({ ...item, variations: enrichedVariations });
}));

// --- POST a new inventory item ---
// Handles requests from the "Add New Product" modal
router.post('/', asyncHandler(async (req, res, next) => {
  try {
    const newItem = new ItemModel(req.body);
    const createdItem = await newItem.save();
    res.status(201).json(createdItem);
  } catch (error) {
    // Catch the unique index violation error
    if (error.code === 11000) {
      res.status(409); // 409 Conflict
      throw new Error('An item with this name already exists.');
    }
    // Pass other errors to the global handler
    next(error);
  }
}));


// --- PUT to update an existing inventory item ---
// Handles requests from the "Edit Product" modal
router.put('/:id', asyncHandler(async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatedItem = await ItemModel.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
    
    if (!updatedItem) {
        res.status(404);
        throw new Error('Item not found');
    }
    res.status(200).json(updatedItem);
  } catch (error) {
    if (error.code === 11000) {
      res.status(409);
      throw new Error('An item with this name already exists.');
    }
    next(error);
  }
}));


// --- DELETE an inventory item ---
// Handles requests from the "Delete" button
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const item = await ItemModel.findById(id);

  if (!item) {
    res.status(404);
    throw new Error('Item not found');
  }

  // --- THIS IS THE NEW LOGIC ---

  // 1. Gather all image URLs from all of the item's variations.
  const urlsToDelete = item.variations
    .map(variation => variation.imageUrl)
    .filter(Boolean); // filter(Boolean) removes any null or undefined URLs

  // 2. If there are URLs to delete, call the Vercel Blob delete function.
  if (urlsToDelete.length > 0) {
    await del(urlsToDelete);
  }
  
  // 3. Finally, delete the item from the database.
  await item.deleteOne();

  res.status(200).json({ message: `Item ${id} and its associated images deleted successfully.` });
}));

router.post('/:itemId/heart', asyncHandler(async (req, res) => {
  const { itemId } = req.params;

  // Use findByIdAndUpdate with the $inc operator for an atomic update.
  // This is efficient and prevents race conditions.
  const updatedItem = await ItemModel.findByIdAndUpdate(
    itemId,
    { $inc: { heartCount: 1 } },
    { new: true } // This option returns the updated document
  );

  if (!updatedItem) {
    res.status(404);
    throw new Error('Item not found');
  }

  // Send back just the new heart count for a lightweight response.
  res.status(200).json({ heartCount: updatedItem.heartCount });
}));

// Decrements the heart count for a specific item.
router.delete('/:itemId/heart', asyncHandler(async (req, res) => {
  const { itemId } = req.params;

  // Atomically decrement the heartCount, but prevent it from going below zero.
  const updatedItem = await ItemModel.findOneAndUpdate(
    { _id: itemId, heartCount: { $gt: 0 } }, // Only update if heartCount > 0
    { $inc: { heartCount: -1 } },
    { new: true }
  );

  if (!updatedItem) {
    // This can happen if the item doesn't exist or heartCount is already 0.
    // It's safe to just return the current state in this case.
    const currentItem = await ItemModel.findById(itemId);
    if (!currentItem) {
      res.status(404);
      throw new Error('Item not found');
    }
    return res.status(200).json({ heartCount: currentItem.heartCount });
  }

  // Send back the new heart count.
  res.status(200).json({ heartCount: updatedItem.heartCount });
}));


module.exports = router;