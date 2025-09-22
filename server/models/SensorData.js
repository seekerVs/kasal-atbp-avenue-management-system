const mongoose = require("mongoose");

const SensorDataSchema = new mongoose.Schema(
  {
    sensorType: {
      type: String,
      required: true,
      trim: true,
    },
    command: {
      type: String,
      required: false, // Only present for 'Control' type sensor data
      trim: true,
    },
    // For RotaryEncoder (raw ticks)
    position: {
      type: Number,
      required: false, // Validation is now handled in the route
      default: 0,
    },
    direction: {
      type: Number,
      required: false,
      default: 0,
    },
    // For LengthMeasurement (converted value)
    centimeters: {
      type: Number,
      required: false, // Validation is now handled in the route
      default: 0.0,
    },
    // Generic value (for other potential sensors)
    value: {
      type: Number,
      required: false,
    },
  },
  {
    timestamps: true, // This automatically adds `createdAt` and `updatedAt`
  }
);

const SensorData = mongoose.model("SensorData", SensorDataSchema);
module.exports = SensorData;