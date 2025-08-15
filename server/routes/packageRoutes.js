const express = require('express');
const mongoose = require('mongoose');
const PackageModel = require('../models/Package');
const asyncHandler = require('../utils/asyncHandler');

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