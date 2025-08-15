// server/routes/inventoryRoutes.js

const express = require('express');
const ItemModel = require('../models/Item');
const asyncHandler = require('../utils/asyncHandler');
const { del } = require('@vercel/blob');

const router = express.Router();

// --- GET all inventory items (Existing) ---
router.get('/', asyncHandler(async (req, res) => {
  // 1. Get pagination and filter parameters from the query string
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 18;
  const { category, categories, ageGroup, gender, search, sort, colorHex, excludeCategory } = req.query;

  // 2. Build the filter object dynamically (same as before)
  const filter = {};
  if (category) filter.category = category;
  if (ageGroup) filter.ageGroup = ageGroup;
  if (gender) filter.gender = gender;
  if (search) filter.name = { $regex: search, $options: 'i' };
  if (colorHex) {
    filter['variations'] = { $elemMatch: { 'color.hex': colorHex } };
  }
  if (excludeCategory) {
    filter.category = { ...filter.category, $ne: excludeCategory };
  }

  if (categories) {
    // If 'categories' query param exists (e.g., "Veils,Jewelry"), split it into an array.
    const categoryArray = categories.split(',');
    // Use MongoDB's $in operator to find items where the category is in the provided array.
    filter.category = { $in: categoryArray };
  } else if (category) {
    // Fallback to the original single category filter if 'categories' is not provided.
    filter.category = category;
  }
  
  const sortOptions = {};
  if (sort === 'price_asc') sortOptions.price = 1;
  if (sort === 'price_desc') sortOptions.price = -1;
  if (sort === 'latest') sortOptions.createdAt = -1;
  // Default sort (can be relevance score later, or just name)
  if (Object.keys(sortOptions).length === 0) sortOptions.name = 1;

  // 3. Calculate the number of documents to skip
  const skip = (page - 1) * limit;

  // 4. Execute two queries in parallel for efficiency:
  //    - One to get the total count of documents matching the filter
  //    - One to get the actual documents for the current page
  const [items, totalItems] = await Promise.all([
    ItemModel.find(filter)
      .sort(sortOptions) // You can adjust sorting here if needed
      .limit(limit)
      .skip(skip)
      .lean(),
    ItemModel.countDocuments(filter)
  ]);

  // 5. Send the paginated response
  res.status(200).json({
    items, // The array of items for the current page
    currentPage: page,
    totalPages: Math.ceil(totalItems / limit),
    totalItems: totalItems,
  });
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


// ==========================================================
// --- ADD THE MISSING ENDPOINTS BELOW ---
// ==========================================================

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