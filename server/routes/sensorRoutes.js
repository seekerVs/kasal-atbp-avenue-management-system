const express = require('express');
const SensorDataModel = require('../models/SensorData');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

const CURRENT_SENSOR_DATA_ID = "60c72b2f9f1b2c3d4e5f6a7b";

// POST /sensorData
router.post("/sensorData", asyncHandler(async (req, res) => {
  const { sensorType, position, direction, centimeters, value } = req.body;
  const updateData = { sensorType };

  if (sensorType === "LengthMeasurement") {
    if (typeof centimeters !== "number") throw new Error("Centimeters value missing or invalid.");
    updateData.centimeters = centimeters;
    updateData.position = position;
  } else if (sensorType === "RotaryEncoder") {
    if (typeof position === "undefined" || typeof direction === "undefined") throw new Error("Position or direction missing for RotaryEncoder.");
    updateData.position = position;
    updateData.direction = direction;
  } else if (typeof value !== "undefined") {
    updateData.value = value;
  } else {
    throw new Error("Invalid sensorType or missing data.");
  }

  const currentSensorData = await SensorDataModel.findOneAndUpdate(
    { _id: CURRENT_SENSOR_DATA_ID },
    updateData,
    { upsert: true, new: true, runValidators: true }
  );
  res.status(200).json({ success: true, message: "Current sensor data updated", data: currentSensorData });
}));

// GET /sensorData
router.get("/sensorData", asyncHandler(async (req, res) => {
  const currentSensorData = await SensorDataModel.findById(CURRENT_SENSOR_DATA_ID);
  if (!currentSensorData) {
    return res.status(404).json({ success: false, message: "No current sensor data found." });
  }
  res.status(200).json({ success: true, data: currentSensorData });
}));

module.exports = router;