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

// --- Route Imports ---
const authRoutes = require('./routes/authRoutes.js');
const sensorRoutes = require('./routes/sensorRoutes.js');
const inventoryRoutes = require('./routes/inventoryRoutes.js');
const packageRoutes = require('./routes/packageRoutes.js');
const rentalRoutes = require('./routes/rentalRoutes.js');
const dashboardRoutes = require('./routes/dashboardRoutes.js');
const measurementRefRoutes = require('./routes/measurementRefRoutes.js');
const contentRoutes = require('./routes/contentRoutes.js');

// --- Route Definitions ---
const API_PREFIX = '/api';

// Use the routers for specific base paths
app.use(`${API_PREFIX}/auth`, authRoutes); // e.g., /api/auth/login
app.use(`${API_PREFIX}/inventory`, inventoryRoutes);
app.use(`${API_PREFIX}/packages`, packageRoutes);
app.use(`${API_PREFIX}/rentals`, rentalRoutes);
app.use(`${API_PREFIX}/dashboard`, dashboardRoutes);
app.use(`${API_PREFIX}/measurementrefs`, measurementRefRoutes);
app.use(`${API_PREFIX}/content`, contentRoutes);


// Sensor routes do not have the /api prefix as per original file
app.use('/', sensorRoutes);


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
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
