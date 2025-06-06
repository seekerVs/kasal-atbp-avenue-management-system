// src/models/SensorData.js
const mongoose = require("mongoose");

const SensorDataSchema = new mongoose.Schema(
  {
    sensorType: {
      type: String,
      required: true,
      trim: true,
    },
    // For RotaryEncoder (raw ticks)
    position: {
      type: Number,
      required: function () {
        return this.sensorType === "RotaryEncoder";
      },
      default: 0,
    },
    direction: {
      // This field is no longer sent from ESP, so make it optional if it was there
      type: Number,
      required: false, // Make optional if not sent
      default: 0,
    },
    // For LengthMeasurement (converted value)
    centimeters: {
      type: Number,
      required: function () {
        return this.sensorType === "LengthMeasurement";
      },
      default: 0.0,
    },
    // Generic value (if you have other sensors sending just a 'value')
    value: {
      type: Number,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

const SensorData = mongoose.model("SensorData", SensorDataSchema);
module.exports = SensorData;
