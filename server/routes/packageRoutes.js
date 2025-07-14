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

// GET /api/packages/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const pkg = await PackageModel.findById(req.params.id).lean();
  if (!pkg) return res.status(404).json({ message: "Package not found." });
  res.status(200).json(pkg);
}));

// POST /api/packages/
router.post('/', asyncHandler(async (req, res) => {
  const newPackage = new PackageModel(req.body);
  const savedPackage = await newPackage.save();
  res.status(201).json(savedPackage);
}));

// PUT /api/packages/:id
router.put('/:id', asyncHandler(async (req, res) => {
  const updatedPackage = await PackageModel.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );
  if (!updatedPackage) return res.status(404).json({ message: "Package not found." });
  res.status(200).json(updatedPackage);
}));

// DELETE /api/packages/:id
router.delete('/:id', asyncHandler(async (req, res) => {
  const deletedPackage = await PackageModel.findByIdAndDelete(req.params.id);
  if (!deletedPackage) return res.status(404).json({ message: "Package not found." });
  res.status(200).json({ message: "Package deleted successfully." });
}));

module.exports = router;