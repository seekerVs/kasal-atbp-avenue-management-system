const express = require('express');
const ItemModel = require('../models/Item');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// GET /api/inventory/
router.get('/', asyncHandler(async (req, res) => {
  const { search, category, sort } = req.query;
  let filter = {};
  if (search) filter.name = { $regex: search, $options: 'i' };
  if (category) filter.category = category;
  
  let sortOption = {};
  if (sort === 'latest') sortOption = { createdAt: -1 };
  else if (sort === 'price_asc') sortOption = { price: 1 };
  else if (sort === 'price_desc') sortOption = { price: -1 };
  else sortOption = { name: 1 };

  const items = await ItemModel.find(filter).sort(sortOption).lean();
  res.status(200).json(items);
}));

// GET /api/inventory/byFullName/:fullName
router.get('/byFullName/:fullName', asyncHandler(async (req, res) => {
  const productName = req.params.fullName.split(',')[0];
  const item = await ItemModel.findOne({ name: productName }).lean();
  if (!item) return res.status(404).json({ message: "Item not found." });
  res.status(200).json(item);
}));

module.exports = router;