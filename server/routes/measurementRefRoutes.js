const express = require('express');
const MeasurementRefModel = require('../models/MeasurementRef');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// GET /api/measurementrefs/
router.get('/', asyncHandler(async (req, res) => {
  const refs = await MeasurementRefModel.find({}).sort({ category: 1, outfitName: 1 });
  res.status(200).json(refs);
}));

module.exports = router;