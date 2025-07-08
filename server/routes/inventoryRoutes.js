// server/routes/inventoryRoutes.js

const express = require('express');
const ItemModel = require('../models/Item');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// --- GET all inventory items (Existing) ---
router.get('/', asyncHandler(async (req, res) => {
  const items = await ItemModel.find({}).sort({ name: 1 }).lean();
  res.status(200).json(items);
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
router.post('/', asyncHandler(async (req, res) => {
  // We expect the request body to have the shape of our Item model
  const { name, price, category, description, variations, features, composition } = req.body;

  // Basic validation
  if (!name || !category || !price) {
    res.status(400); // Bad Request
    throw new Error('Please provide a name, category, and price for the item.');
  }

  const newItem = new ItemModel({
    name,
    price,
    category,
    description,
    variations,
    features,
    composition
  });

  const createdItem = await newItem.save();
  res.status(201).json(createdItem); // 201 Created
}));


// --- PUT to update an existing inventory item ---
// Handles requests from the "Edit Product" modal
router.put('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, price, category, description, variations, features, composition } = req.body;

  const item = await ItemModel.findById(id);

  if (!item) {
    res.status(404);
    throw new Error('Item not found');
  }

  // Update the fields
  item.name = name || item.name;
  item.price = price || item.price;
  item.category = category || item.category;
  item.description = description || item.description;
  item.variations = variations || item.variations;
  item.features = features || item.features;
  item.composition = composition || item.composition;

  const updatedItem = await item.save();
  res.status(200).json(updatedItem);
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

  await item.deleteOne(); // Mongoose v6+ uses deleteOne() on the document
  res.status(200).json({ message: `Item ${id} deleted successfully.` });
}));


module.exports = router;