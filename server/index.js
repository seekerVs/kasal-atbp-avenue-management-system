const express = require("express");
const cors = require("cors");
const jwt = require('jsonwebtoken'); // For JWT implementation
require('dotenv').config();
const connectDB = require("./db.js");

// --- Initialize Express App & Connect to DB ---
const app = express();
connectDB();

// --- Core Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended: true}))

// --- Route Imports ---
const authRoutes = require('./routes/authRoutes.js');
const sensorRoutes = require('./routes/sensorRoutes.js');
const inventoryRoutes = require('./routes/inventoryRoutes.js');
const packageRoutes = require('./routes/packageRoutes.js');
const rentalRoutes = require('./routes/rentalRoutes.js');
const dashboardRoutes = require('./routes/dashboardRoutes.js');
const measurementRefRoutes = require('./routes/measurementRefRoutes.js');
const contentRoutes = require('./routes/contentRoutes.js');
const uploadRoutes = require('./routes/uploadRoutes');

// --- Route Definitions ---
const API_PREFIX = '/api';

const PORT = process.env.PORT || 3001;

// Use the routers for specific base paths
app.use(`${API_PREFIX}/auth`, authRoutes); // e.g., /api/auth/login
app.use(`${API_PREFIX}/inventory`, inventoryRoutes);
app.use(`${API_PREFIX}/packages`, packageRoutes);
app.use(`${API_PREFIX}/rentals`, rentalRoutes);
app.use(`${API_PREFIX}/dashboard`, dashboardRoutes);
app.use(`${API_PREFIX}/measurementrefs`, measurementRefRoutes);
app.use(`${API_PREFIX}/content`, contentRoutes);
app.use(`${API_PREFIX}/upload`, uploadRoutes);

// Sensor routes do not have the /api prefix as per original file
app.use('/sensor', sensorRoutes);

app.get("/", (req, res) => {
  res.status(200).json({ 
    message: "Kasal Atbp Avenue Management System API is running.",
    status: "OK",
    timestamp: new Date().toISOString() 
  });
});

// --- Global Error Handler Middleware ---
// This should be the LAST piece of middleware.
// It catches any error passed by the asyncHandler.
app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR HANDLER:", err.stack);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'An unexpected server error occurred.',
  });
});


// --- Server Listening ---
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
