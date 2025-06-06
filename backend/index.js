const express = require("express");
// const mongoose = require('mongoose');
const cors = require("cors");
const connectDB = require("./db.js");
const UserModel = require("./models/Users");
const SensorDataModel = require("./models/SensorData"); // <--- New: Import SensorData model

const app = express();
app.use(cors());
app.use(express.json());

connectDB();

const CURRENT_SENSOR_DATA_ID = "60c72b2f9f1b2c3d4e5f6a7b"; // Example fixed ObjectId

// Endpoint to receive sensor data and update the "current" state
app.post("/sensorData", async (req, res) => {
  try {
    // Destructure all possible fields
    const { sensorType, position, direction, centimeters, value } = req.body;

    // Prepare update data object
    const updateData = { sensorType };

    // Conditional assignment based on sensorType
    if (sensorType === "LengthMeasurement") {
      if (
        typeof centimeters === "undefined" ||
        typeof centimeters !== "number"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Centimeters value missing or invalid for LengthMeasurement.",
        });
      }
      updateData.centimeters = centimeters;
      updateData.position = position; // Optional: keep raw position if desired
      // You might set direction to 0 or null if it's not sent for LengthMeasurement
      // updateData.direction = direction; // Only if you still send it for this type
    } else if (sensorType === "RotaryEncoder") {
      // Assuming this was your old type
      if (typeof position === "undefined" || typeof direction === "undefined") {
        return res.status(400).json({
          success: false,
          message: "Position or direction missing for RotaryEncoder.",
        });
      }
      updateData.position = position;
      updateData.direction = direction;
    } else if (typeof value !== "undefined") {
      // Generic sensor
      updateData.value = value;
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid sensorType or missing data.",
      });
    }

    const currentSensorData = await SensorDataModel.findOneAndUpdate(
      { _id: CURRENT_SENSOR_DATA_ID },
      updateData,
      { upsert: true, new: true, runValidators: true }
    );

    console.log("Updated current sensor data:", currentSensorData);
    res.status(200).json({
      success: true,
      message: "Current sensor data updated",
      data: currentSensorData,
    });
  } catch (error) {
    console.error("Error receiving sensor data:", error);
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message);
      return res
        .status(400)
        .json({ success: false, message: messages.join(", ") });
    }
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
});

app.get("/sensorData", async (req, res) => {
  try {
    const currentSensorData = await SensorDataModel.findById(
      CURRENT_SENSOR_DATA_ID
    );

    if (!currentSensorData) {
      return res
        .status(404)
        .json({ success: false, message: "No current sensor data found yet." });
    }
    res.status(200).json({ success: true, data: currentSensorData });
  } catch (error) {
    console.error("Error fetching current sensor data:", error);
    if (error.name === "CastError") {
      return res
        .status(400)
        .json({
          success: false,
          message: "Invalid ID format for current sensor data.",
        });
    }
    res
      .status(500)
      .json({
        success: false,
        message: "Internal Server Error",
        error: error.message,
      });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Find the user by email
    const user = await UserModel.findOne({ email });

    if (!user) {
      // If user is not found, send a specific message
      return res
        .status(401)
        .json({ success: false, message: "Email not found." });
    }

    // 2. Compare the provided password with the stored password
    //    IMPORTANT: In a real app, you would hash passwords (e.g., using bcrypt)
    //    and compare the hash here: `const isMatch = await bcrypt.compare(password, user.password);`
    if (password !== user.password) {
      // This is INSECURE for production!
      // If password doesn't match, send a specific message
      return res
        .status(401)
        .json({ success: false, message: "Incorrect password." });
    }

    // 3. If credentials match, generate a token (e.g., JWT)
    const token = `dummy_jwt_token_for_${user._id}`; // Replace with actual JWT generation

    res
      .status(200)
      .json({ success: true, message: "Logged in successfully", token });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
});

app.post("/createUser", (req, res) => {
  UserModel.create(req.body)
    .then((users) => res.json(users))
    .catch((err) => res.json(err));
});

app.get("/", (req, res) => {
  UserModel.find({})
    .then((users) => res.json(users))
    .catch((err) => res.json(err));
});

app.get("/getUser/:id", (req, res) => {
  const id = req.params.id;
  UserModel.findById({ _id: id })
    .then((users) => res.json(users))
    .catch((err) => res.json(err));
});

app.put("/updateUser/:id", (req, res) => {
  const id = req.params.id;
  UserModel.findByIdAndUpdate(
    { _id: id },
    {
      name: req.body.name,
      email: req.body.email,
      age: req.body.age,
    }
  )
    .then((users) => res.json(users))
    .catch((err) => res.json(err));
});

app.delete("/deleteUser/:id", (req, res) => {
  const id = req.params.id;
  UserModel.findByIdAndDelete({ _id: id })
    .then((users) => res.json(users))
    .catch((err) => res.json(err));
});

app.listen(3001, () => {
  console.log("Server is running on port 3001");
});
