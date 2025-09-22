const express = require('express');
const SensorDataModel = require('../models/SensorData');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

const CURRENT_SENSOR_DATA_ID = "60c72b2f9f1b2c3d4e5f6a7b";

// POST /sensorData
router.post("/sensorData", asyncHandler(async (req, res) => {
  const { sensorType, position, direction, centimeters, value, action } = req.body;
  
  let updateOperation; 

  if (sensorType === "LengthMeasurement") {
    if (typeof centimeters !== "number") {
      throw new Error("Centimeters value missing or invalid for LengthMeasurement.");
    }
    updateOperation = {
      $set: {
        sensorType: "LengthMeasurement",
        centimeters: centimeters,
        position: position,
      },
      $unset: {
        command: ""
      }
    };
  } else if (sensorType === "Control") {
    if (!action || typeof action !== 'string') {
      throw new Error("An 'action' field is required for the Control sensorType.");
    }
    updateOperation = {
      $set: {
        sensorType: "Control",
        command: action
      },
      $unset: {
        centimeters: "",
        position: ""
      }
    };
  }
  else if (sensorType === "RotaryEncoder") {
    if (typeof position === "undefined" || typeof direction === "undefined") {
      throw new Error("Position or direction missing for RotaryEncoder.");
    }
    updateOperation = {
      $set: { sensorType: "RotaryEncoder", position, direction },
      $unset: { command: "", centimeters: "" }
    };
  } else if (typeof value !== "undefined") {
    updateOperation = {
      $set: { sensorType, value },
      $unset: { command: "", centimeters: "" }
    };
  } else {
    throw new Error("Invalid sensorType or missing required data.");
  }

  const currentSensorData = await SensorDataModel.findOneAndUpdate(
    { _id: CURRENT_SENSOR_DATA_ID },
    updateOperation,
    { upsert: true, new: true, runValidators: true }
  );
  
  res.status(200).json({ success: true, message: "Current sensor data updated", data: currentSensorData });
}));

// GET /sensorData
router.get("/sensorData", asyncHandler(async (req, res) => {
  const currentSensorData = await SensorDataModel.findById(CURRENT_SENSOR_DATA_ID);
  if (!currentSensorData) {
    res.status(404);
    throw new Error("No sensor data has been received yet.");
  }

  res.status(200).json({ success: true, data: currentSensorData });
}));

module.exports = router;